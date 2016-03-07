#!/bin/bash
set -e
set -o pipefail

files=(wp-sync-db.php class/*.php compatibility/*.php template/*.php);
for file in "${files[@]}"
do
  php -l "$file";
done
