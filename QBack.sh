cd ~/AutoviewPro

# 1. 問題のファイルを削除
rm -f uiapp/src/MapView.bak
rm -f uiapp/src/views/MapPickerView.vue
rm -f uiapp/src/views/MapView.vue
rm -f uiapp/src/views/MapView.vuebk

# 2. .gitignore作成
cat > .gitignore << 'EOF'
node_modules/
.venv/
dist/
data/
*.db
*.log
.env
EOF

# 3. Git履歴をリセット
rm -rf .git
git init
git add .
git commit -m "海岸監視 ELECTRON 変更Backup: $(date '+%Y-%m-%d %H:%M:%S')"

# 4. GitHubにプッシュ
git remote add origin https://github.com/jinno0606s/AutoviewPro.git
git push -u origin master --force

# 5. QNAPにプッシュ
git remote add qnap http://192.168.1.40:3000/jinno/AutoviewPro.git
git push qnap master --force

echo "GitHubとQNAP、両方成功！"