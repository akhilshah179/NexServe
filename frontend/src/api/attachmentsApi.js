import api from "./axios";

/**
 * Upload one or multiple pre-booking photo attachments
 * @param {FileList|File[]} files
 * @param {string|null} note
 */
export async function uploadAttachmentsApi(files, note = "") {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }
  if (note) {
    formData.append("note", note);
  }

  const res = await api.post("/attachments/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}
