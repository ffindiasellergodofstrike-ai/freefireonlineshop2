# Purchased download setup on Vercel

The product ZIP must not be placed in `public/`, because every visitor could download it without purchasing. The Vercel Function now proxies a server-only HTTPS object-storage URL after it verifies the customer's purchase and one-time download token.

## Add the LinkNest Pro ZIP

1. In Firebase Console, open **Storage** and upload the real ZIP, for example at `product-files/linknest-pro-template.zip`.
2. Obtain its HTTPS download URL. Treat this URL as a secret because anyone who knows it can access the object directly.
3. In Vercel, open **Project Settings → Environment Variables** and add:

   ```text
   PRODUCT_DOWNLOAD_URL_LINKNEST_PRO=https://...
   ```

4. Enable the variable for Production (and Preview if desired), then redeploy.

The environment-variable suffix is derived from the product id: uppercase it and replace punctuation with underscores. For example, `another-product` uses `PRODUCT_DOWNLOAD_URL_ANOTHER_PRODUCT`. `PRODUCT_DOWNLOAD_URL` can be used as a single-product fallback.

Do not commit the paid ZIP or its signed storage URL to this public repository.

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
