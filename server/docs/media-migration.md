# Media Migration Plan (Django -> MERN)

This project serves uploads from `UPLOAD_DIR` (default: `server/uploads`) and expects files to live under:

```
uploads/
  media/
    documents/
    plastic_committee/
    ...
```

To migrate Django media:

1. Identify Django media root (typically `pmc_be_django-main/media`).
2. Copy the entire `media` directory into MERN's upload directory:
   - Django: `<django>/media/*`
   - MERN: `<repo>/server/uploads/media/*`
3. Ensure the MERN server has `UPLOAD_DIR` set to `server/uploads` (or the chosen path).
4. Verify that `/api/pmc/media/...` serves files:
   - Example: `/api/pmc/media/documents/<filename>`
5. For any legacy paths stored without the `media/` prefix, the API normalizes them in
   `DocumentsUseCases.ts` when serving files.

If your production deployment uses a different storage (e.g., S3), update `UPLOAD_DIR`
and the download endpoints to read from that storage.
