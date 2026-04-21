/**
 * ImageUploader
 * Reusable drag-and-drop / file-picker image upload component.
 * Converts the selected file to a base64 data URL and calls onImage(dataUrl).
 * Shows a preview before confirming.
 *
 * Props:
 *  currentImage  – existing image URL to show as placeholder
 *  onImage       – callback(dataUrl | '') called when user confirms or removes
 *  shape         – 'circle' | 'rect'  (default: 'rect')
 *  label         – optional label string
 *  maxSizeMB     – max file size in MB (default 2)
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, Camera, ImageOff } from 'lucide-react';
import styles from './ImageUploader.module.css';

export default function ImageUploader({
  currentImage = '',
  onImage,
  shape = 'rect',
  label = 'Upload Image',
  maxSizeMB = 2,
}) {
  const [preview, setPreview]   = useState(null); // pending preview (not yet confirmed)
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState('');
  const inputRef = useRef(null);

  const readFile = useCallback((file) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be under ${maxSizeMB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, [maxSizeMB]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    readFile(file);
  }, [readFile]);

  const handleFileChange = (e) => readFile(e.target.files?.[0]);

  const confirm = () => {
    onImage(preview);
    setPreview(null);
  };

  const cancel = () => {
    setPreview(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = () => {
    onImage('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const displayed = preview || currentImage;
  const isCircle  = shape === 'circle';

  return (
    <div className={`${styles.root} ${isCircle ? styles.circleRoot : ''}`}>
      {label && !isCircle && (
        <p className={styles.label}>{label}</p>
      )}

      {/* Drop / click zone */}
      <div
        className={`${styles.zone} ${isCircle ? styles.zoneCircle : ''} ${dragging ? styles.dragging : ''} ${displayed ? styles.hasImage : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label={label}
      >
        {displayed ? (
          <>
            <img src={displayed} alt="Preview" className={`${styles.img} ${isCircle ? styles.imgCircle : ''}`} />
            <div className={`${styles.overlay} ${isCircle ? styles.overlayCircle : ''}`}>
              {isCircle ? <Camera size={20} /> : <Upload size={18} />}
              <span>{isCircle ? 'Change' : 'Replace'}</span>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.uploadIcon}>
              <Upload size={isCircle ? 22 : 26} />
            </div>
            <p className={styles.hint}>
              {isCircle ? 'Upload photo' : 'Drag & drop or click to upload'}
            </p>
            {!isCircle && (
              <p className={styles.sub}>PNG, JPG, WEBP · max {maxSizeMB} MB</p>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={handleFileChange}
      />

      {error && <p className={styles.error}>{error}</p>}

      {/* Preview confirmation bar */}
      {preview && (
        <div className={styles.confirmBar}>
          <span className={styles.confirmText}>Use this image?</span>
          <div className={styles.confirmActions}>
            <button type="button" className={`${styles.iconBtn} ${styles.cancelBtn}`} onClick={cancel} title="Cancel">
              <X size={16} />
            </button>
            <button type="button" className={`${styles.iconBtn} ${styles.confirmBtn}`} onClick={confirm} title="Confirm">
              <Check size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Remove button — only shown when there's a current image and no pending preview */}
      {currentImage && !preview && (
        <button type="button" className={styles.removeBtn} onClick={remove}>
          <ImageOff size={13} /> Remove image
        </button>
      )}
    </div>
  );
}
