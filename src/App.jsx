// src/App.jsx
import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";

// UI Components
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";

// Pages
import AttendancePage from "./pages/Attendance";
import MassPage from "./pages/MassPage";
import ChildrenPage from "./pages/ChildrenPage";

// Auth
const AUTH_USERNAME = "ملايكاوي";
const AUTH_PASSWORD = "12345";

// Protected Route
function ProtectedRoute({ children }) {
  const isLogged = localStorage.getItem("logged") === "true";
  return isLogged ? children : <Navigate to="/" />;
}

// Login Page
function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    if (user === AUTH_USERNAME && pass === AUTH_PASSWORD) {
      localStorage.setItem("logged", "true");
      window.location.href = "#/dashboard";
    } else {
      setError("❌ بيانات غير صحيحة");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/church-bg.jpg')] bg-cover bg-center p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl p-4 backdrop-blur-md bg-white/80">
        <CardContent>
          <h1 className="text-3xl font-bold mb-2 text-center text-red-900">ملائكة كنيسة السيدة العذراء – محرم بك</h1>
          <h2 className="text-lg font-semibold text-center mb-4 text-gray-700">تسجيل دخول المسؤول</h2>
          {error && <p className="text-center text-red-600 mb-2">{error}</p>}
          <div className="space-y-3">
            <input onChange={(e) => setUser(e.target.value)} placeholder="اسم المستخدم" className="w-full p-3 border rounded-xl" />
            <input onChange={(e) => setPass(e.target.value)} placeholder="كلمة المرور" type="password" className="w-full p-3 border rounded-xl" />
          </div>
          <Button className="w-full mt-4" onClick={handleLogin}>تسجيل الدخول</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard Page
function Dashboard() {
  return (
    <div className="min-h-screen p-6 bg-[url('/church-bg.jpg')] bg-cover bg-center">
      <div className="bg-white/80 p-6 rounded-2xl shadow-xl backdrop-blur-md">
        <h1 className="text-4xl font-bold mb-6 text-red-900 text-center">لوحة التحكم</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4 rounded-2xl shadow-xl hover:shadow-2xl transition bg-white/80 backdrop-blur-md">
            <CardContent>
              <Link to="/attendance" className="block text-xl font-semibold text-center">📘 تسجيل حضور مدارس الاحد</Link>
            </CardContent>
          </Card>
          <Card className="p-4 rounded-2xl shadow-xl hover:shadow-2xl transition bg-white/80 backdrop-blur-md">
            <CardContent>
              <Link to="/mass" className="block text-xl font-semibold text-center">⛪ تسجيل حضور القداس</Link>
            </CardContent>
          </Card>
          <Card className="p-4 rounded-2xl shadow-xl hover:shadow-2xl transition bg-white/80 backdrop-blur-md">
            <CardContent>
              <Link to="/children" className="block text-xl font-semibold text-center">👼 إدارة بيانات الأطفال</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Install Button
function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    });
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowButton(false);
      });
    }
  };

  if (!showButton) return null;

  return (
    <button onClick={handleInstall} className="fixed bottom-4 right-4 px-4 py-2 bg-red-600 text-white rounded-xl shadow-lg">
      ➕ Install App
    </button>
  );
}

// Main App
export default function App() {
  return (
    <Router>
      <InstallButton />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
        <Route path="/mass" element={<ProtectedRoute><MassPage /></ProtectedRoute>} />
        <Route path="/children" element={<ProtectedRoute><ChildrenPage /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
