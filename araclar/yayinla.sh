#!/bin/sh
# Siteyi derler ve çıktıyı gh-pages dalına gönderir. GitHub Pages bu daldan yayınlar.
# Kullanım: npm run yayinla   (gh, matristechnology hesabıyla açık olmalı)
set -e
DEPO=https://github.com/matristechnology/matristechnology.github.io.git
npm run build
G=$(mktemp -d)
cp -R dist/. "$G"
cd "$G"
git init -q -b gh-pages
git config user.name "Matris"
git config user.email "361169570+matristechnology@users.noreply.github.com"
git add -A
git commit -q -m "Site çıktısı"
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -f "$DEPO" gh-pages
rm -rf "$G"
echo "Gönderildi. Birkaç dakika içinde https://matristechnology.github.io/ güncellenir."
