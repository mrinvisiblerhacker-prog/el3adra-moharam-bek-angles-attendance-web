// src/pages/Attendance.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { debounce } from "lodash";
import * as XLSX from "xlsx";

export default function AttendancePage() {
  const [children, setChildren] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [newChildName, setNewChildName] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const attendanceCollection = collection(db, "attendance");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(attendanceCollection);
        const tempChildren = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return { id: docSnap.id, name: data.name, days: data.days || {} };
        });
        setChildren(tempChildren);
      } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        alert("❌ فشل تحميل البيانات");
      }
    };
    fetchData();
  }, []);

  const debounceUpdate = debounce(async (docRef, date, field, value) => {
    try {
      await updateDoc(docRef, { [`days.${date}.${field}`]: value }, { merge: true });
    } catch (error) {
      console.error("خطأ في تحديث اليوم:", error);
      alert("❌ فشل تحديث اليوم");
    }
  }, 300);

  const addChild = async () => {
    const trimmedName = newChildName.trim();
    if (!trimmedName) return alert("⚠️ أدخل اسم الطفل");

    const childId = trimmedName.replace(/\s+/g, "_") + "_" + Date.now();
    const newChild = { name: trimmedName, days: {} };

    try {
      const docRef = doc(db, "attendance", childId);
      await setDoc(docRef, newChild);
      setChildren(prev => [...prev, { id: childId, name: trimmedName, days: {} }]);
      setNewChildName("");
    } catch (error) {
      console.error("خطأ في إضافة الطفل:", error);
      alert("❌ حدث خطأ أثناء الإضافة");
    }
  };

  const handleCheckboxChange = (childId, field, checked) => {
    setChildren(prev =>
      prev.map(c => {
        if (c.id === childId) {
          const updatedDays = { ...c.days, [selectedDate]: { ...c.days[selectedDate], [field]: checked } };
          const docRef = doc(db, "attendance", childId);
          debounceUpdate(docRef, selectedDate, field, checked);
          return { ...c, days: updatedDays };
        }
        return c;
      })
    );
  };

  const deleteChild = async (childId) => {
    const docRef = doc(db, "attendance", childId);
    try {
      await deleteDoc(docRef);
      setChildren(prev => prev.filter(c => c.id !== childId));
    } catch (error) {
      console.error("خطأ في حذف الطفل:", error);
      alert("❌ فشل حذف الطفل");
    }
  };

  const resetAttendance = async () => {
    if (!window.confirm("هل أنت متأكد من إعادة ضبط الحضور لهذا اليوم؟")) return;
    try {
      const updatedChildren = [];
      for (const c of children) {
        const updatedDays = { ...c.days, [selectedDate]: { present: false, absent: false } };
        const docRef = doc(db, "attendance", c.id);
        await updateDoc(docRef, { [`days.${selectedDate}`]: updatedDays[selectedDate] });
        updatedChildren.push({ ...c, days: updatedDays });
      }
      setChildren(updatedChildren);
    } catch (error) {
      console.error("خطأ في إعادة ضبط الحضور:", error);
      alert("❌ حدث خطأ أثناء إعادة ضبط الحضور");
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every(cell => !cell)) continue;
        const name = row[0] || "";
        if (!name) continue;

        const childId = name.replace(/\s+/g, "_") + "_" + Date.now();
        const newChild = { name, days: {} };

        try {
          const docRef = doc(db, "attendance", childId);
          await setDoc(docRef, newChild);
          setChildren(prev => [...prev, { id: childId, name, days: {} }]);
        } catch (error) {
          console.error("خطأ في إضافة الاسم من Excel:", error);
        }
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const filteredChildren = useMemo(() => 
    children
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [children, search]
  );

  const totalPages = Math.ceil(filteredChildren.length / rowsPerPage);
  const currentData = filteredChildren.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="min-h-screen p-6">
      <div className="backdrop-blur-md bg-white/90 p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4 text-center text-red-900">📘 حضور الأطفال لمدارس الأحد</h1>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <input
            type="text"
            placeholder="ابحث عن اسم الطفل..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="p-2 border rounded-xl w-full md:w-auto flex-grow"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="p-2 border rounded-xl w-full md:w-auto"
          />
          <input
            type="text"
            placeholder="اضافة اسم الطفل..."
            value={newChildName}
            onChange={e => setNewChildName(e.target.value)}
            className="p-2 border rounded-xl w-full md:w-auto"
          />
          <button onClick={addChild} className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition">
            ➕ إضافة طفل
          </button>
          <label className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 cursor-pointer transition">
            ⬆️ Upload Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleUpload} className="hidden" />
          </label>
          <button onClick={resetAttendance} className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition">
            🔄 إعادة ضبط الحضور
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border shadow rounded-xl text-center min-w-[500px]">
            <thead className="bg-red-800 text-white text-lg sticky top-0">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3 w-60">اسم الطفل</th>
                <th className="p-3 w-24">حضور ✅</th>
                <th className="p-3 w-24">غياب ❌</th>
                <th className="p-3 w-16">حذف</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((child, idx) => {
                const dayData = child.days[selectedDate] || { present: false, absent: false };
                const realIndex = (currentPage - 1) * rowsPerPage + idx;
                return (
                  <tr key={child.id} className="even:bg-gray-100 hover:bg-gray-200 transition">
                    <td className="p-3">{realIndex + 1}</td>
                    <td className="p-3 text-left">{child.name}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="w-7 h-7"
                        checked={dayData.present}
                        onChange={e => handleCheckboxChange(child.id, "present", e.target.checked)}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="w-7 h-7"
                        checked={dayData.absent}
                        onChange={e => handleCheckboxChange(child.id, "absent", e.target.checked)}
                      />
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => deleteChild(child.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center mt-4 gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            السابق
          </button>
          <span>الصفحة {currentPage} من {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            التالي
          </button>
        </div>

      </div>
    </div>
  );
}
