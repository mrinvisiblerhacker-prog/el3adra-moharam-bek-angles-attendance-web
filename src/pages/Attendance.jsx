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
      await updateDoc(docRef, { [`days.${date}.${field}`]: value });
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
          const updatedDays = {
            ...c.days,
            [selectedDate]: { ...c.days[selectedDate], [field]: checked }
          };
          const docRef = doc(db, "attendance", childId);
          debounceUpdate(docRef, selectedDate, field, checked);
          return { ...c, days: updatedDays };
        }
        return c;
      })
    );
  };

  // ✅ التعديل هنا فقط
  const deleteChild = async (childId, childName) => {
    const ok = window.confirm(`⚠️ هل أنت متأكد من حذف بيانات الطفل:\n"${childName}" ؟\n\n❌ لا يمكن التراجع`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "attendance", childId));
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
        const updatedDays = {
          ...c.days,
          [selectedDate]: { present: false, absent: false }
        };
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

  const filteredChildren = useMemo(
    () =>
      children
        .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, "ar")),
    [children, search]
  );

  const totalPages = Math.ceil(filteredChildren.length / rowsPerPage);
  const currentData = filteredChildren.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="min-h-screen p-6">
      <div className="bg-white/90 p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-semibold mb-4 text-center text-red-900">
          📘 حضور الأطفال لمدارس الأحد
        </h1>

        <div className="overflow-x-auto">
          <table className="w-full border shadow rounded-xl text-center min-w-[500px]">
            <thead className="bg-red-800 text-white">
              <tr>
                <th>#</th>
                <th>اسم الطفل</th>
                <th>حضور</th>
                <th>غياب</th>
                <th>حذف</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((child, idx) => {
                const dayData = child.days[selectedDate] || {};
                return (
                  <tr key={child.id}>
                    <td>{idx + 1}</td>
                    <td>{child.name}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={dayData.present || false}
                        onChange={e =>
                          handleCheckboxChange(child.id, "present", e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={dayData.absent || false}
                        onChange={e =>
                          handleCheckboxChange(child.id, "absent", e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => deleteChild(child.id, child.name)}
                        className="bg-red-500 text-white px-2 py-1 rounded"
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
      </div>
    </div>
  );
}
