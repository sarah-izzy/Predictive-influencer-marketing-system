"""Training orchestration for the multi-stage influencer prediction models."""

import numpy as np
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import f1_score, mean_squared_error, r2_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier, XGBRegressor

from constants import ALL_FEATURES, CATEGORICAL_FEATURES, NUMERIC_FEATURES
from ml import (
    SEED,
    _build_preprocessor,
    _generate_dataset,
    add_stage1_pred,
    add_stage2_pred,
    feature_engineering,
    make_pipe,
)
from model_store import save_models as persist_models
from state import STATE


def train_models(n_samples: int = 1200, save_models: bool = False):
    """
    Generate the synthetic dataset and train all 4 pipeline models.
    Stage 1: Engagement Rate
    Stage 2: Conversion Rate  (chain - uses pred_ER)
    Stage 3: Revenue          (chain - uses pred_ER + pred_CVR)
    Classifier: Campaign Success probability
    """
    N = n_samples
    df, cold_start_infs = _generate_dataset(N)
    df = feature_engineering(df)

    cold_mask = df["influencer_id"].isin(cold_start_infs)
    warm_df   = df[~cold_mask].copy()
    cold_df   = df[cold_mask].copy()

    warm_infs = warm_df["influencer_id"].unique()
    train_infs, test_infs = train_test_split(warm_infs, test_size=0.20, random_state=SEED)
    train_infs2, val_infs = train_test_split(train_infs, test_size=0.176, random_state=SEED)

    train_df = warm_df[warm_df.influencer_id.isin(train_infs2)].copy()
    val_df   = warm_df[warm_df.influencer_id.isin(val_infs)].copy()
    test_df  = warm_df[warm_df.influencer_id.isin(test_infs)].copy()

    X_train = train_df[ALL_FEATURES]; X_val = val_df[ALL_FEATURES]
    X_test  = test_df[ALL_FEATURES];  X_cold = cold_df[ALL_FEATURES]

    preprocessor = _build_preprocessor()

    def eval_reg(pipe, Xtr, ytr, Xv, yv):
        pipe.fit(Xtr, ytr)
        p = pipe.predict(Xv)
        return pipe, float(np.sqrt(mean_squared_error(yv, p))), float(r2_score(yv, p))

    s1_models = {
        "Ridge":         make_pipe(Ridge(alpha=1.0), _build_preprocessor()),
        "Random Forest": make_pipe(RandomForestRegressor(n_estimators=200,random_state=SEED,n_jobs=-1), _build_preprocessor()),
        "XGBoost":       make_pipe(XGBRegressor(n_estimators=200,learning_rate=0.05,max_depth=6,random_state=SEED,verbosity=0), _build_preprocessor()),
        "LightGBM":      make_pipe(LGBMRegressor(n_estimators=200,learning_rate=0.05,random_state=SEED,verbose=-1), _build_preprocessor()),
    }
    y_s1_train = train_df["actual_engagement_rate"]
    y_s1_val   = val_df["actual_engagement_rate"]
    s1_results = {}
    for name, pipe in s1_models.items():
        fitted, rmse, r2 = eval_reg(pipe, X_train, y_s1_train, X_val, y_s1_val)
        s1_results[name] = {"pipe": fitted, "rmse": rmse, "r2": r2}

    best_s1_name = max(s1_results, key=lambda k: s1_results[k]["r2"])
    best_s1_pipe = s1_results[best_s1_name]["pipe"]

    pred_er_train = best_s1_pipe.predict(X_train)
    pred_er_val   = best_s1_pipe.predict(X_val)
    pred_er_test  = best_s1_pipe.predict(X_test)
    pred_er_cold  = best_s1_pipe.predict(X_cold)

    NUM_S2 = NUMERIC_FEATURES + ["pred_engagement_rate"]
    pre_s2 = ColumnTransformer([
        ("num", Pipeline([("imp",SimpleImputer(strategy="median")),("sc",StandardScaler())]), NUM_S2),
        ("cat", Pipeline([("imp",SimpleImputer(strategy="most_frequent")),
                          ("enc",OneHotEncoder(handle_unknown="ignore",sparse_output=False))]), CATEGORICAL_FEATURES),
    ], remainder="drop")

    X_train_s2 = add_stage1_pred(X_train, pred_er_train)
    X_val_s2   = add_stage1_pred(X_val,   pred_er_val)
    X_test_s2  = add_stage1_pred(X_test,  pred_er_test)
    X_cold_s2  = add_stage1_pred(X_cold,  pred_er_cold)

    best_s2_pipe = Pipeline([("pre",pre_s2),("model",XGBRegressor(n_estimators=200,learning_rate=0.05,
                                                                    max_depth=6,random_state=SEED,verbosity=0))])
    y_s2_train = train_df["actual_conversion_rate_pct"]
    y_s2_val   = val_df["actual_conversion_rate_pct"]
    _, s2_rmse, s2_r2 = eval_reg(best_s2_pipe, X_train_s2, y_s2_train, X_val_s2, y_s2_val)

    pred_cvr_train = best_s2_pipe.predict(X_train_s2)
    pred_cvr_test  = best_s2_pipe.predict(X_test_s2)
    pred_cvr_cold  = best_s2_pipe.predict(X_cold_s2)

    NUM_S3 = NUMERIC_FEATURES + ["pred_engagement_rate", "pred_conversion_rate"]
    pre_s3 = ColumnTransformer([
        ("num", Pipeline([("imp",SimpleImputer(strategy="median")),("sc",StandardScaler())]), NUM_S3),
        ("cat", Pipeline([("imp",SimpleImputer(strategy="most_frequent")),
                          ("enc",OneHotEncoder(handle_unknown="ignore",sparse_output=False))]), CATEGORICAL_FEATURES),
    ], remainder="drop")

    X_train_s3 = add_stage2_pred(X_train, pred_er_train, pred_cvr_train)
    X_val_s3   = add_stage2_pred(X_val,   pred_er_val,   best_s2_pipe.predict(X_val_s2))
    X_test_s3  = add_stage2_pred(X_test,  pred_er_test,  pred_cvr_test)

    best_s3_pipe = Pipeline([("pre",pre_s3),("model",XGBRegressor(n_estimators=200,learning_rate=0.05,
                                                                    max_depth=6,random_state=SEED,verbosity=0))])
    y_s3_train = train_df["actual_revenue_usd"]
    y_s3_val   = val_df["actual_revenue_usd"]
    _, s3_rmse, s3_r2 = eval_reg(best_s3_pipe, X_train_s3, y_s3_train, X_val_s3, y_s3_val)

    cls_models = {
        "Logistic Regression": make_pipe(LogisticRegression(max_iter=1000,random_state=SEED), _build_preprocessor()),
        "Random Forest":       make_pipe(RandomForestClassifier(n_estimators=200,random_state=SEED,n_jobs=-1), _build_preprocessor()),
        "XGBoost":             make_pipe(XGBClassifier(n_estimators=200,learning_rate=0.05,max_depth=6,
                                                        eval_metric="logloss",random_state=SEED,verbosity=0), _build_preprocessor()),
        "LightGBM":            make_pipe(LGBMClassifier(n_estimators=200,learning_rate=0.05,random_state=SEED,verbose=-1), _build_preprocessor()),
    }
    y_cls_train = train_df["campaign_success"]
    y_cls_val   = val_df["campaign_success"]
    cls_results = {}
    for name, pipe in cls_models.items():
        pipe.fit(X_train, y_cls_train)
        preds = pipe.predict(X_val)
        proba = pipe.predict_proba(X_val)[:,1]
        cls_results[name] = {
            "pipe": pipe,
            "f1":   float(f1_score(y_cls_val, preds)),
            "auc":  float(roc_auc_score(y_cls_val, proba)),
        }

    best_cls_name = max(cls_results, key=lambda k: cls_results[k]["auc"])
    best_cls_pipe = cls_results[best_cls_name]["pipe"]

    STATE.update({
        "trained":    True,
        "s1_pipe":    best_s1_pipe,
        "s2_pipe":    best_s2_pipe,
        "s3_pipe":    best_s3_pipe,
        "cls_pipe":   best_cls_pipe,
        "train_df":   train_df,
        "val_df":     val_df,
        "test_df":    test_df,
        "cold_df":    cold_df,
        "preprocessor": preprocessor,
        "dataset":    df,
        "model_files": {},
        "model_source": "in_memory_training",
        "model_load_error": None,
        "model_load_warning": None,
    })

    if save_models:
        persist_models()

    return {
        "status": "trained",
        "dataset_shape": list(df.shape),
        "best_stage1_model":  best_s1_name,
        "best_classifier":    best_cls_name,
        "stage1_r2":   round(s1_results[best_s1_name]["r2"], 4),
        "stage1_rmse": round(s1_results[best_s1_name]["rmse"], 4),
        "stage2_r2":   round(s2_r2, 4),
        "stage2_rmse": round(s2_rmse, 4),
        "stage3_r2":   round(s3_r2, 4),
        "stage3_rmse": round(s3_rmse, 4),
        "classifier_auc": round(cls_results[best_cls_name]["auc"], 4),
        "classifier_f1":  round(cls_results[best_cls_name]["f1"], 4),
        "models_saved": save_models,
    }
