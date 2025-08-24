// utils/cloudinary.ts
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type: string;
  created_at: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: string;
  quality?: string | number;
  format?: string;
  width?: number;
  height?: number;
  crop?: string;
}

class CloudinaryUploader {
  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
    // console.log('Cloudinary configuration:', {
    //   cloudName: this.cloudName,
    //   uploadPreset: this.uploadPreset,
    // });

    if (!this.cloudName || !this.uploadPreset) {
      console.warn('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables.');
    }
  }

  /**
   * Upload a file to Cloudinary
   * @param file - The file to upload
   * @param options - Upload options
   * @returns Promise with upload result
   */
  async uploadImage(
    file: File, 
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.cloudName || !this.uploadPreset) {
      throw new Error('Cloudinary configuration is missing');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('cloud_name', this.cloudName);

      // Add optional parameters
      if (options.folder) {
        formData.append('folder', options.folder);
      }

      if (options.transformation) {
        formData.append('transformation', options.transformation);
      }

      if (options.quality) {
        formData.append('quality', options.quality.toString());
      }

      if (options.format) {
        formData.append('format', options.format);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
      }

      const result: CloudinaryUploadResult = await response.json();
      return result;

    } catch (error) {
      console.error('Cloudinary upload error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload multiple images
   * @param files - Array of files to upload
   * @param options - Upload options
   * @returns Promise with array of upload results
   */
  async uploadMultipleImages(
    files: File[], 
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete an image from Cloudinary
   * @param publicId - The public ID of the image to delete
   * @returns Promise with deletion result
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name is missing');
    }

    try {
      // Note: For security reasons, deletion should typically be done on the server side
      // This is a client-side example that requires your upload preset to allow deletions
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('upload_preset', this.uploadPreset);

      const deleteUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;

      const response = await fetch(deleteUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Generate optimized image URL with transformations
   * @param publicId - The public ID of the image
   * @param transformations - Transformation options
   * @returns Optimized image URL
   */
  generateOptimizedUrl(
    publicId: string, 
    transformations: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
      blur?: number;
      brightness?: number;
      contrast?: number;
      saturation?: number;
    } = {}
  ): string {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name is missing');
    }

    let transformStr = '';
    const transforms: string[] = [];

    if (transformations.width) transforms.push(`w_${transformations.width}`);
    if (transformations.height) transforms.push(`h_${transformations.height}`);
    if (transformations.crop) transforms.push(`c_${transformations.crop}`);
    if (transformations.quality) transforms.push(`q_${transformations.quality}`);
    if (transformations.format) transforms.push(`f_${transformations.format}`);
    if (transformations.blur) transforms.push(`e_blur:${transformations.blur}`);
    if (transformations.brightness) transforms.push(`e_brightness:${transformations.brightness}`);
    if (transformations.contrast) transforms.push(`e_contrast:${transformations.contrast}`);
    if (transformations.saturation) transforms.push(`e_saturation:${transformations.saturation}`);

    if (transforms.length > 0) {
      transformStr = transforms.join(',') + '/';
    }

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformStr}${publicId}`;
  }
}

// Export singleton instance
export const cloudinaryUploader = new CloudinaryUploader();

// Utility hook for React components
export const useCloudinaryUpload = () => {
  const uploadImage = async (
    file: File, 
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> => {
    return cloudinaryUploader.uploadImage(file, options);
  };

  const uploadMultipleImages = async (
    files: File[], 
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult[]> => {
    return cloudinaryUploader.uploadMultipleImages(files, options);
  };

  const deleteImage = async (publicId: string) => {
    return cloudinaryUploader.deleteImage(publicId);
  };

  const generateOptimizedUrl = (publicId: string, transformations = {}) => {
    return cloudinaryUploader.generateOptimizedUrl(publicId, transformations);
  };

  return {
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    generateOptimizedUrl,
  };
};

// Helper function for common use cases
export const uploadCoverImage = async (file: File): Promise<string> => {
  const { public_id } = await cloudinaryUploader.uploadImage(file, {
    folder: 'cover-images'
  });

  // add resizing/quality in the delivery URL, not in upload
  return cloudinaryUploader.generateOptimizedUrl(public_id, {
    width: 1_200,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });
};


export const uploadProfileImage = async (file: File): Promise<string> => {
  const result = await cloudinaryUploader.uploadImage(file, {
    folder: 'profiles',
    quality: 'auto',
    format: 'auto',
    width: 400,
    height: 400,
    crop: 'fill'
  });
  return result.secure_url;
};