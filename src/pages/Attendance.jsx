// src/pages/Attendance.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { debounce } from "lodash";
import * as XLSX from "xlsx";

export default function AttendancePage() {
  const [children, setChildren] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
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
      await updateDoc(docRef, {
        [`days.${date}.${field}`]: value
      });
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
      setChildren(prev => [
        ...prev,
        { id: childId, name: trimmedName, days: {} }
      ]);
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
            [selectedDate]: {
              ...c.days[selectedDate],
              [field]: checked
            }
          };
          const docRef = doc(db, "attendance", childId);
          debounceUpdate(docRef, selectedDate, field, checked);
          return { ...c, days: updatedDays };
        }
        return c;
      })
    );
  };

  // ✅ حذف الطفل مع رسالة تأكيد
  const deleteChild = async (child) => {
    const confirmDelete = window.confirm(
      `⚠️ هل أنت متأكد من حذف بيانات الطفل:\n\n${child.name}\n\n❗ سيتم حذف كل بيانات الحضور نهائيًا`
    );

    if (!confirmDelete) return;

    try {
      const docRef = doc(db, "attendance", child.id);
      await deleteDoc(docRef);
      setChildren(prev => prev.filter(c => c.id !== child.id));
    } catch (error) {
      console.error("خطأ في حذف الطفل:", error);
      alert("❌ فشل حذف الطفل");
    }
  };

  const resetAttendance = async () => {
    if (!window.confirm("⚠️ هل أنت متأكد من إعادة ضبط الحضور لهذا اليوم؟")) return;

    try {
      const updatedChildren = [];
      for (const c of children) {
        const updatedDays = {
          ...c.days,
          [selectedDate]: { present: false, absent: false }
        };
        const docRef = doc(db, "attendance", c.id);
        await updateDoc(docRef, {
          [`days.${selectedDate}`]: updatedDays[selectedDate]
        });
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
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[0]) continue;

        const name = row[0];
        const childId = name.replace(/\s+/g, "_") + "_" + Date.now();

        try {
          const docRef = doc(db, "attendance", childId);
          await setDoc(docRef, { name, days: {} });
          setChildren(prev => [...prev, { id: childId, name, days: {} }]);
        } catch (error) {
          console.error("خطأ في إضافة الاسم من Excel:", error);
        }
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
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
      <div className="backdrop-blur-md bg-white/90 p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-red-900">
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
              {currentData.map((child, idx) => (
                <tr key={child.id} className="even:bg-gray-100">
                  <td>{idx + 1}</td>
                  <td>{child.name}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={child.days[selectedDate]?.present || false}
                      onChange={e =>
                        handleCheckboxChange(child.id, "present", e.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={child.days[selectedDate]?.absent || false}
                      onChange={e =>
                        handleCheckboxChange(child.id, "absent", e.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => deleteChild(child)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
