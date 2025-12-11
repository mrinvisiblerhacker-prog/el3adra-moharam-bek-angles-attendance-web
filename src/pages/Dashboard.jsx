import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="min-h-screen p-6 bg-[url('/church-bg.jpg')] bg-cover bg-center bg-fixed">
      <div className="backdrop-blur-md bg-white/80 p-6 rounded-2xl shadow-xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-red-900">لوحة التحكم</h1>
        <div className="space-y-4">
          <Link to="/attendance" className="block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
            📘 تسجيل الحضور والغياب
          </Link>
        </div>
      </div>
    </div>
  );
}
