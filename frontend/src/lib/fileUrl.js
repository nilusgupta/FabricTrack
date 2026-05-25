/**
 * Build the correct URL for a file stored either on local EC2 disk
 * (served directly by Nginx, no auth, very fast) or on Emergent Object
 * Storage (auth-protected via `/api/files/<path>`, slower).
 *
 * Local files are recognised by the `local/` prefix that the backend
 * applies when LOCAL_UPLOADS_DIR is configured. Everything else falls
 * back to the existing authenticated endpoint for backward compatibility
 * with images uploaded before this change.
 */
export function fileUrl(storagePath) {
  if (!storagePath) return null;
  if (storagePath.startsWith('local/')) {
    // Nginx alias `/uploads/` → /opt/fabrictrack/uploads/  (configured in
    // /etc/nginx/sites-available/fabrictrack). Skips FastAPI completely.
    return `/uploads/${storagePath.slice('local/'.length)}`;
  }
  return `/api/files/${storagePath}`;
}
