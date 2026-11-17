# 本机部署

GitHub Actions 部署工作流已经删除。在本机 Git Bash 中执行脚本，本机编译 Linux 可执行文件并上传到 /var/www/my-exp/my-exp，服务器重启 my-exp 服务。服务器不需要 Go 或 Git。

本机需要 Go 1.26.0、Git Bash 中的 ssh 和 scp。在仓库根目录执行下面的命令。

```bash
# 使用默认 SSH 密钥或密码连接。
bash server/scripts/deploy.sh root@服务器IP
# 指定本机私钥，Windows 路径使用 Git Bash 的 /c/ 形式。
bash server/scripts/deploy.sh root@服务器IP /c/Users/你的用户名/.ssh/id_ed25519
# 自定义端口和架构，默认端口 22，默认架构 amd64。
SSH_PORT=2222 TARGET_ARCH=arm64 bash server/scripts/deploy.sh root@服务器IP
# 修改健康检查地址，默认检查本机 8080 端口。
HEALTH_URL=http://127.0.0.1:9090/health bash server/scripts/deploy.sh root@服务器IP
```

在服务器执行 uname -m，x86_64 使用 amd64，aarch64 使用 arm64。Ubuntu 需要 curl、flock 和 systemd，缺少工具时执行 sudo apt install curl util-linux。登录用户需要能写入 /var/www/my-exp，并直接执行 systemctl restart my-exp。

首次切换前把 .env 和运行文件放到 /var/www/my-exp，并调整现有 my-exp.service 中的下面两项。其他服务配置继续保留，使用 EnvironmentFile 时也要调整路径。

```ini
# 在现有服务的 Service 部分修改运行目录和启动路径。
[Service]
WorkingDirectory=/var/www/my-exp
ExecStart=/var/www/my-exp/my-exp
```

```bash
# 修改服务配置后重新加载，再从本机执行部署。
sudo systemctl daemon-reload
```

新文件还没上传时不要手动重启。首次切换时，可以先把原来的可执行文件复制到 /var/www/my-exp/my-exp，供失败时回滚。

编译或上传失败不会重启服务。上传成功后备份旧版，替换文件并重启，健康检查失败会恢复 my-exp.bak 并重启上一版。重启期间有短暂中断，健康检查只验证 HTTP 能响应。每次上传使用独立临时文件，脚本退出时自动清理。
