import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, X, ImagePlus, Loader2 } from "lucide-react";
import { uploadAttachmentsApi } from "../../api/attachmentsApi";
import { cn } from "../ui";
import { getErrorMessage } from "../../lib/format";

export default function PhotoUploadDropzone({ onAttachmentsUploaded, uploadedList = [], maxFiles = 5, maxSizeMb = 5 }) {
  const [attachments, setAttachments] = useState(uploadedList);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const full = attachments.length >= maxFiles;

  const handleFiles = async (files) => {
    setErrorMsg("");
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > maxFiles) {
      setErrorMsg(`You can upload up to ${maxFiles} photos.`);
      return;
    }

    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        setErrorMsg(`"${file.name}" isn't an image. Use PNG, JPG or WEBP.`);
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setErrorMsg(`"${file.name}" is larger than ${maxSizeMb}MB.`);
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
        onAttachmentsUploaded?.(updated);
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index) => {
    const updated = attachments.filter((_, idx) => idx !== index);
    setAttachments(updated);
    onAttachmentsUploaded?.(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="label mb-0">Photos of the job <span className="text-ink-500 font-normal">(optional)</span></p>
        <span className="text-xs text-ink-500 tabular">
          {attachments.length}/{maxFiles}
        </span>
      </div>

      <div
        role="button"
        tabIndex={uploading || full ? -1 : 0}
        aria-disabled={uploading || full}
        aria-label="Upload photos"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading && !full) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (!uploading && !full) fileInputRef.current?.click();
        }}
        className={cn(
          "rounded-2xl border border-dashed p-5 text-center transition-colors duration-200",
          dragOver ? "border-primary-400 bg-primary-500/[0.08]" : "border-white/10 hover:border-primary-400/40 bg-white/[0.015]",
          uploading || full ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading || full}
        />
        {uploading ? (
          <div className="flex flex-col items-center py-1 text-primary-300">
            <Loader2 className="w-6 h-6 animate-spin mb-2" aria-hidden="true" />
            <span className="text-sm font-medium">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center mb-2.5">
              {dragOver ? <ImagePlus className="w-5 h-5 text-primary-300" /> : <UploadCloud className="w-5 h-5 text-ink-300" />}
            </span>
            <p className="text-sm text-ink-200">
              <span className="text-primary-300 font-semibold">Click to upload</span> or drag photos here
            </p>
            <p className="text-xs text-ink-500 mt-0.5">PNG, JPG or WEBP · up to {maxSizeMb}MB each</p>
          </div>
        )}
      </div>

      {errorMsg && (
        <p role="alert" className="mt-2 text-[13px] text-rose-300">
          {errorMsg}
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 mt-3">
          <AnimatePresence initial={false}>
            {attachments.map((att, idx) => (
              <motion.li
                key={att.id || idx}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative rounded-xl overflow-hidden aspect-square bg-surface-800 ring-1 ring-white/10"
              >
                <img src={att.file_url} alt={att.file_name || "Uploaded photo"} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(idx);
                  }}
                  aria-label={`Remove ${att.file_name || "photo"}`}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-surface-950/80 text-white flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
