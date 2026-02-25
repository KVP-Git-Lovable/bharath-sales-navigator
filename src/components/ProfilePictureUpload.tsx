import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImageForUpload } from "@/utils/imageCompression";

interface ProfilePictureUploadProps {
  userId: string;
  currentPhotoUrl?: string;
  fullName: string;
  onPhotoUpdate: (newUrl: string) => void;
  size?: "sm" | "md" | "lg" | "xl";
}

export const ProfilePictureUpload = ({
  userId,
  currentPhotoUrl,
  fullName,
  onPhotoUpdate,
  size = "xl",
}: ProfilePictureUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-40 h-40",
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const compressed = await compressImageForUpload(file);
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/profile_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("employee-photos")
        .upload(fileName, compressed);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("employee-photos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_picture_url: urlData.publicUrl, onboarding_completed: true })
        .eq("id", userId);

      if (updateError) throw updateError;

      onPhotoUpdate(urlData.publicUrl);
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative group">
      <Avatar className={`${sizeClasses[size]} border-4 border-white shadow-elegant cursor-pointer`}>
        <AvatarImage src={currentPhotoUrl} />
        <AvatarFallback className="text-4xl">{fullName.charAt(0)}</AvatarFallback>
      </Avatar>
      <Button
        size="icon"
        variant="secondary"
        className="absolute bottom-0 right-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};
