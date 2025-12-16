const CLOUD_NAME = "dzskvtxku";
const UPLOAD_PRESET = "menusmenu";

export const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  // 👇 ESTE LOG ES LA CLAVE
  console.log("🔥 RESPUESTA CLOUDINARY COMPLETA:", data);

  if (!res.ok) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return data.secure_url;
};
