import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FaMapMarkerAlt } from "react-icons/fa";

export default function TicketSelection() {
  // State for form inputs
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Load saved data from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("fullName");
    const savedEmail = localStorage.getItem("email");
    const savedAvatar = localStorage.getItem("avatar");

    if (savedName) setFullName(savedName);
    if (savedEmail) setEmail(savedEmail);
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  // Save data to localStorage on change
  useEffect(() => {
    localStorage.setItem("fullName", fullName);
    localStorage.setItem("email", email);
    localStorage.setItem("avatar", avatar);
  }, [fullName, email, avatar]);

  // Form validation function
  const validateForm = () => {
    let tempErrors = {};
    if (!fullName.trim()) tempErrors.fullName = "Full name is required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) tempErrors.email = "Valid email is required";
    if (!avatar.trim() || !avatar.startsWith("http")) tempErrors.avatar = "Valid image URL is required";
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
      <div className="w-full max-w-2xl p-6 rounded-lg bg-gray-800 shadow-md">
        <h2 className="text-xl font-semibold mb-2 text-center">Conference Ticket Generator</h2>
        <div className="w-full h-1 bg-blue-400 mb-4" />

        {/* Event Details */}
        <Card className="bg-gray-700 p-4 rounded-md">
          <CardContent className="text-center">
            <h3 className="text-2xl font-bold">Techember Fest "25</h3>
            <p className="text-gray-400 text-sm">
              Join us for an unforgettable experience at [Event Name]! Secure your spot now.
            </p>
            <div className="flex justify-center items-center gap-1 mt-2 text-gray-300 text-sm">
              <FaMapMarkerAlt /> <span>[Event Location]</span> | <span>March 15, 2025 | 7:00 PM</span>
            </div>
          </CardContent>
        </Card>

        {/* Form Section */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold">Full Name:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2 border rounded-md bg-gray-900 text-white"
                required
              />
              {errors.fullName && <p className="text-red-400 text-sm">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold">Email Address:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded-md bg-gray-900 text-white"
                required
              />
              {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold">Avatar (Image URL):</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full p-2 border rounded-md bg-gray-900 text-white"
                required
              />
              {errors.avatar && <p className="text-red-400 text-sm">{errors.avatar}</p>}
            </div>

            <Button type="submit" className="w-full bg-blue-400 text-gray-900">
              Generate Ticket
            </Button>
          </form>
        ) : (
          // Ticket Display Section
          <div className="mt-6 p-4 bg-gray-700 rounded-md text-center">
            <h3 className="text-lg font-semibold mb-2">Your Ticket</h3>
            <div className="border-t border-gray-600 my-2"></div>
            <img src={avatar} alt="Avatar" className="w-24 h-24 mx-auto rounded-full" />
            <p className="text-xl font-semibold mt-2">{fullName}</p>
            <p className="text-gray-300">{email}</p>
            <Button onClick={() => setSubmitted(false)} className="mt-4 bg-blue-400 text-gray-900">
              Edit Details
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
