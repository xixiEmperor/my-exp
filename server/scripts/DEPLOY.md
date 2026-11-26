# 本机部署

本机编译 Linux 可执行文件并上传到 /var/www/my-exp，服务器同步 Git 源码，确认源码提交与本机编译提交一致后替换程序并重启 my-exp。运行文件留在 /var/www/my-exp，仓库放在独立的 source 子目录。服务器需要 Git，不需要 Go。

本机需要 Go 1.26.0、Git、Git Bash 中的 ssh 和 scp。部署前提交并推送 server 与 demos 的变更，当前分支应与服务器拉取分支一致。未提交源码、未跟踪文件或编译后变化会使脚本停止。

## 从 CMD 执行

现有部署脚本使用 Bash，在 Windows CMD 中调用 Git Bash 执行，不使用 PowerShell。

```bat
rem 在仓库根目录，从 CMD 启动部署脚本。
"C:\Program Files\Git\bin\bash.exe" server/scripts/deploy.sh root@服务器IP

rem 私钥路径使用 Git Bash 能识别的 /c/ 格式。
"C:\Program Files\Git\bin\bash.exe" server/scripts/deploy.sh root@服务器IP /c/Users/你的用户名/.ssh/id_ed25519

rem 需要自定义时先在 CMD 设置变量，再调用同一个脚本。
set SSH_PORT=2222
set TARGET_ARCH=arm64
set DEPLOY_BRANCH=main
set REMOTE_SOURCE_DIR=/var/www/my-exp/source
```

下面保留 Git Bash 中的调用方式。

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

在服务器执行 uname -m，x86_64 使用 amd64，aarch64 使用 arm64。Ubuntu 需要 Git、curl、flock 和 systemd，缺少工具时执行 sudo apt install git curl util-linux。登录用户需要能写入 /var/www/my-exp，并直接执行 systemctl restart my-exp。

## 源码仓库与扫描目录

默认从本机 origin 读取仓库 URL，使用当前本地分支。首次在服务器克隆，后续执行 git pull --ff-only。服务器需提前配置仓库读取凭证，非交互拉取失败时脚本不会要求输入密码并继续等待。私有仓库可以给服务器配置只读 SSH 凭证，再指定对应地址。

```bat
rem 当前 CMD 会话中指定服务器可读取的仓库地址。
set DEPLOY_REPO_URL=git@github.com:你的账号/你的仓库.git
```

| 变量              | 默认值与用途                       |
| ----------------- | ---------------------------------- |
| DEPLOY_REPO_URL   | 本机 origin，首次服务器 clone 使用 |
| DEPLOY_BRANCH     | 本机当前分支                       |
| REMOTE_SOURCE_DIR | /var/www/my-exp/source             |
| SSH_PORT          | 22                                 |
| TARGET_ARCH       | amd64                              |
| HEALTH_URL        | http://127.0.0.1:8080/health       |

已有源码 checkout 必须处于对应分支且没有本地修改。脚本不自动换分支，不覆盖服务器修改。运行配置与上传数据放在运行目录，不放进 Git checkout。已有仓库使用其现有 origin，不自动改写仓库凭证。

后续源码扫描接口使用 DEMO_SOURCE_ROOT，配置值指向 checkout 中的 demos。可以在运行目录 .env 中配置，具体读取由扫描功能实现。

```dotenv
# 后台扫描源码的位置，路径以每个 demo 目录为扫描根。
DEMO_SOURCE_ROOT=/var/www/my-exp/source/demos
```

每次扫描结果保存为对应版本的 JSON 相对路径数组。git pull 只更新当前 checkout，不能覆盖旧版本记录，也不能代替历史版本源码快照。

## 服务配置

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

编译、上传或 Git 拉取失败不会重启服务。源码提交不一致时停止部署并恢复已有 checkout 的原提交，先处理未推送代码或分支继续更新的问题，再重新部署。

源码一致后备份旧可执行文件、替换并重启。健康检查失败时先恢复已有源码提交，再恢复 my-exp.bak 并重启上一版；首次 clone 没有旧 checkout 可恢复。运行配置不参与 Git 回退。重启期间有短暂中断，健康检查只验证 HTTP 能响应。上传使用独立临时文件，退出时只清理本次文件。
