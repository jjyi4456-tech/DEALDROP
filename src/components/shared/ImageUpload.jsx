import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Loader2, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImageUpload({
  value,
  onChange,
  shape = "square",
  aspect,
  className,
  placeholderIcon: Placeholder = Camera,
  cameraLabel,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "relative flex items-center justify-center overflow-hidden border bg-muted/50",
          shape === "circle" ? "rounded-full" : "rounded-xl",
          aspect === "video" && "aspect-video w-full",
          !value && "text-muted-foreground",
          className
        )}
      >
        {value ? (
          <img src={value} alt="upload" className="h-full w-full object-cover" />
        ) : (
          <Placeholder className="h-8 w-8 opacity-40" />
        )}

        <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Camera className="h-4 w-4" />
        </span>

        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  );
}