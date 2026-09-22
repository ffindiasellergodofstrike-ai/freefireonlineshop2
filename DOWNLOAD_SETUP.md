# Purchased download setup on Vercel

The product ZIP must not be placed in `public/`, because every visitor could download it without purchasing. The Vercel Function proxies a server-only HTTPS source after it verifies the customer's purchase and one-time download token. Both MEGA shared-file links and direct HTTPS object-storage URLs are supported.

## Add the LinkNest Pro ZIP

1. Upload the real ZIP to MEGA and create a **file** link (not a folder link).
2. Copy the complete link, including the `#` decryption-key portion. Treat it as a secret because anyone who knows it can decrypt and download the file.
3. In Vercel, open **Project Settings → Environment Variables** and add:

   ```text
   PRODUCT_DOWNLOAD_URL_LINKNEST_PRO=https://mega.nz/file/FILE_ID#DECRYPTION_KEY
   ```

4. Enable the variable for Production (and Preview if desired), then redeploy.

The environment-variable suffix is derived from the product id: uppercase it and replace punctuation with underscores. For example, `another-product` uses `PRODUCT_DOWNLOAD_URL_ANOTHER_PRODUCT`. `PRODUCT_DOWNLOAD_URL` can be used as a single-product fallback.

The server decrypts and verifies the MEGA file as a ZIP before it consumes the customer's one-time token. The MEGA link is never sent to the browser. A direct HTTPS URL from Firebase Storage or another object store can be used instead.

Do not commit the paid ZIP or its MEGA/signed storage URL to this public repository.

## Future Easebuzz activation

Configure these Vercel Environment Variables when the merchant account is ready:

```text
APP_URL=https://your-production-domain.example
EASEBUZZ_KEY=your-merchant-key
EASEBUZZ_SALT=your-server-only-salt
EASEBUZZ_ENV=test
CRON_SECRET=a-long-random-secret
```

Use `EASEBUZZ_ENV=prod` only after test payments and callbacks succeed. The salt and cron secret must never use a `VITE_` prefix or be exposed to browser code.
