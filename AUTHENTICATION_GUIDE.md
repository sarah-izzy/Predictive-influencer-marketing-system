# Unified Authentication Page Guide

## Overview
A complete authentication system supporting both **Brand Marketers** and **Influencers** with role-based dynamic UI, form validation, and secure routing.

---

## Features Implemented

### 1. **Role Selection**
- Two selectable role cards: "Brand Marketer" and "Influencer"
- Dynamic UI updates based on selected role:
  - **Brand Marketer**: Blue color theme (primary-600), briefcase icon
  - **Influencer**: Purple color theme (accent-500), users icon
- Smooth hover animations and transitions
- Back to Home button to return to landing page

### 2. **Authentication Forms**

#### Sign In Tab
- **Fields**: Email, Username, Password
- Password visibility toggle (eye icon)
- Form validation with error messages
- Loading state during submission

#### Create Account Tab
- **Fields**: Full Name, Email, Username, Password, Confirm Password
- Password strength validation (minimum 6 characters)
- Password confirmation matching
- Email format validation
- Loading state during submission

### 3. **Dynamic Theming**
- Colors adapt to selected role:
  - Input focus states
  - Button colors
  - Role indicator badges
  - Tab toggle highlighting
- Smooth transitions between themes

### 4. **Error Handling**
- Real-time form validation
- Field-specific error highlighting
- Error messages displayed in alert boxes
- Clear visual feedback for validation failures

### 5. **Navigation**
- Back button to return to role selection
- Back to Home button to return to landing page
- Automatic routing after successful login:
  - Brand: `/brand/overview`
  - Influencer: `/influencer/overview`

### 6. **User Experience**
- Clean, professional interface
- Responsive design (mobile/tablet/desktop)
- Animated background orbs
- Smooth page transitions
- Accessible form controls

---

## How It Works

### User Flow - Sign Up
1. User navigates to `/login`
2. Selects role (Brand Marketer or Influencer)
3. Chooses "Create Account" tab
4. Fills in registration form
5. System creates account and logs them in
6. User is redirected to their role-specific dashboard

### User Flow - Sign In
1. User navigates to `/login`
2. Selects role
3. Uses "Sign In" tab (default)
4. Enters credentials
5. System authenticates and logs them in
6. User is redirected to their role-specific dashboard

### User Flow - Cancel
1. From role selection: Click "Back to Home" → Returns to "/"
2. From forms: Click "← Back to roles" → Returns to role selection

---

## Technical Implementation

### AuthContext Updates
- **`selectedRole`** state: Stores the currently selected role (persisted in localStorage)
- **`setRole(role)`** function: Updates the selected role
- **`login(email, username, password, role)`** function: Creates/authenticates user with new signature

### Login Page State
- Form data for both Sign In and Create Account
- Error handling and validation
- Loading states
- Password visibility toggles

### Styling (in `index.css`)
- `.auth-page`: Main container with background orbs
- `.auth-role-selection`: Role selection view
- `.auth-form-container`: Authentication form view
- `.auth-tab-toggle`: Tab switching UI
- `.auth-input-wrapper`: Input fields with icons
- Responsive breakpoints at 520px

---

## Testing Credentials

The system uses mock data. You can enter any credentials:

### Sign In
- Email: `brand@test.com` or `influencer@test.com`
- Username: Any text
- Password: Any text (minimum 6 characters)

### Create Account
- All fields are required
- Password must be 6+ characters
- Passwords must match
- Email must contain "@"

---

## Customization Guide

### Changing Role Colors
Edit `roleConfig` object in `Login.jsx`:
```javascript
brand: {
  color: 'var(--primary-500)',      // Change this
  lightColor: 'var(--primary-50)',   // And this
  borderColor: 'var(--primary-200)', // And this
  // ...
}
```

### Adding More Fields
1. Add to form state in `Login.jsx`
2. Create input component
3. Update validation logic
4. Add styling as needed

### Customizing Error Messages
Modify validation functions:
- `validateSignIn()` - Line ~95
- `validateSignUp()` - Line ~110

### API Integration (Production)
Replace the demo login in `handleSignIn` and `handleSignUp`:
```javascript
// Current:
await new Promise((resolve) => setTimeout(resolve, 800));

// Replace with:
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, username, password, role })
});
```

---

## Files Modified

1. **`src/context/AuthContext.jsx`**
   - Added selectedRole state tracking
   - Updated login function signature
   - Added setRole function

2. **`src/pages/Login.jsx`**
   - Complete rewrite with new authentication flow
   - Added form validation
   - Dynamic role-based theming

3. **`src/index.css`**
   - Added 350+ lines of authentication styling
   - Responsive design
   - Smooth transitions and animations

4. **`src/App.jsx`**
   - Added Home page route
   - Updated layout logic for public pages
   - Imported Home component

---

## Browser Support
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari 11+, Chrome Mobile)

---

## Security Notes

⚠️ **Current Implementation (Demo)**
- Uses mock authentication
- Credentials accepted for demo purposes
- No backend validation

✅ **For Production**
- Implement backend validation
- Use HTTPS
- Hash passwords (bcrypt, argon2)
- Implement JWT tokens
- Add CSRF protection
- Validate inputs server-side
- Add rate limiting for auth attempts
