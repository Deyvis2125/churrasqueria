import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config"; // ajusta la ruta si es necesario
import { uploadImageToCloudinary } from "../../services/cloudinary.js";

export default function AdminMenus() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const addItem = async (e) => {
    e.preventDefault();
    if (!name || !price || !image) {
      alert("Completa todos los campos");
      return;
    }

    try {
      setLoading(true);

      console.log("📸 Imagen seleccionada:", image);

      const imageUrl = await uploadImageToCloudinary(image);

    await addDoc(collection(db, "menus"), {
      plato: name,
      precio: Number(price),
      img: imageUrl,
    });

      // 3️⃣ Limpiar formulario
      setName("");
      setPrice("");
      setImage(null);

      alert("Menú agregado correctamente");
    } catch (error) {
      console.error(error);
      alert("Error al agregar el menú");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Gestión de Menús</h2>

      <form onSubmit={addItem} style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 8 }}>
          <label>Nombre del plato</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Precio</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Imagen</label>
         <input
  type="file"
  accept="image/*"
  onChange={(e) => setImage(e.target.files[0])}
/>

        </div>

        <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Subiendo..." : "Agregar"}
        </button>
      </form>
    </div>
  );
}

