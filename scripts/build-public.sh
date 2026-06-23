#!/usr/bin/env bash
# PortabIA — build PRODUCTION pour https://portabia.essn.fr (base /, indexable).
# Ne casse pas la preview (qui reste base /portabia/). E²SN — Guillaume BOUTON.
set -e
cd "$(dirname "$0")/.."
DOMAIN="https://portabia.essn.fr"
OUT="dist-public"

echo "→ build (base /) vers $OUT"
npx vite build --base=/ --outDir="$OUT"

echo "→ adaptation index.html pour le domaine public"
sed -i "s#https://preview.essn.fr/portabia/#$DOMAIN/#g; s#https://preview.essn.fr/#$DOMAIN/#g" "$OUT/index.html"

echo "→ robots.txt PUBLIC (indexable)"
cat > "$OUT/robots.txt" <<EOF
User-agent: *
Allow: /
Sitemap: $DOMAIN/sitemap.xml
EOF

echo "→ sitemap.xml PUBLIC"
cat > "$OUT/sitemap.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
  <url><loc>$DOMAIN/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
EOF

echo "→ manifest start_url racine"
sed -i 's#"/portabia/#"/#g' "$OUT/manifest.webmanifest" 2>/dev/null || true

echo "→ llms.txt URL publique"
sed -i "s#https://preview.essn.fr/portabia/#$DOMAIN/#g" "$OUT/llms.txt" 2>/dev/null || true

echo "✅ build public prêt dans $OUT"
