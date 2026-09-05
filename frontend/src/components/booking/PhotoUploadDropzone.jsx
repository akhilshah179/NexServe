import React, { useState, useRef } from "react";
import { FiUploadCloud, FiX, FiImage, FiCheck, FiLoader } from "react-icons/fi";
import { uploadAttachmentsApi } from "../../api/attachmentsApi";

export default function PhotoUploadDropzone({
  onAttachmentsUploaded,
  uploadedList = [],
  maxFiles = 5,
  maxSizeMb = 5,
}) {
  const [attachments, setAttachments] = useState(uploadedList);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    setErrorMsg("");
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > maxFiles) {
      setErrorMsg(`You can upload a maximum of ${maxFiles} photos.`);
      return;
    }

    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        setErrorMsg(`"${file.name}" is not a valid image format.`);
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setErrorMsg(`"${file.name}" exceeds the ${maxSizeMb}MB size limit.`);
        return;
      }
      validFiles.push(file);
    }

    setUploading(true);
    try {
      const res = await uploadAttachmentsApi(validFiles);
      if (res.attachments) {
        const updated = [...attachments, ...res.attachments];
        setAttachments(updated);
        if (onAttachmentsUploaded) {
          onAttachmentsUploaded(updated);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to upload photo(s).");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index) => {
    const updated = attachments.filter((_, idx) => idx !== index);
    setAttachments(updated);
    if (onAttachmentsUploaded) {
      onAttachmentsUploaded(updated);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <FiImage className="text-blue-400" />
          <span>Upload Problem Photos / Work Area (Optional)</span>
        </label>
        <span className="text-[11px] text-slate-500">
          {attachments.length}/{maxFiles} photos
        </span>
      </div>

      {/* Dropzone container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => {
          if (!uploading && attachments.length < maxFiles) {
            fileInputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition duration-200 ${
          dragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-slate-700 hover:border-slate-500 bg-slate-800/30"
        } ${uploading || attachments.length >= maxFiles ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || attachments.length >= maxFiles}
        />

        {uploading ? (
          <div className="flex flex-col items-center py-2 text-blue-400">
            <FiLoader className="w-7 h-7 animate-spin mb-2" />
            <span className="text-xs font-medium">Uploading photos...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FiUploadCloud className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-400" />
            <p className="text-xs text-slate-300 font-medium">
              <span className="text-blue-400 font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, or WEBP (Max {maxSizeMb}MB each)</p>
          </div>
        )}
      </div>

      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

      {/* Previews */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
          {attachments.map((att, idx) => (
            <div
              key={att.id || idx}
              className="group relative rounded-xl overflow-hidden border border-slate-700 aspect-square bg-slate-800"
            >
              <img
                src={att.file_url}
                alt={att.file_name || "Uploaded photo"}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(idx);
                }}
                className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-red-500"
                title="Remove photo"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 truncate">
                {att.file_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
