# 镜像 tag 默认取当前时间 YYYYMMDDhhmm（可用 IMAGE_TAG=xxx 覆盖）
IMAGE_TAG ?= $(shell date +%Y%m%d%H)
# 转为立即展开，保证同一次 make 调用内 tag/push 用的是同一个时间戳
IMAGE_TAG := $(IMAGE_TAG)
IMAGE ?= ccr.ccs.tencentyun.com/awesome/mcp-playground:$(IMAGE_TAG)
APP_NAME ?= mcp-playground

.PHONY: tag push pm2_start pm2_stop pm2_restart pm2_redeploy pm2_logs

tag:
	docker build -t $(IMAGE) .

push:
	docker push $(IMAGE)

pm2_start:
	WEB_ROOT=$(CURDIR)/packages/web/dist pm2 start dist/index.js --name $(APP_NAME) --cwd packages/server --interpreter node

pm2_stop:
	pm2 stop $(APP_NAME)

pm2_restart:
	pm2 restart $(APP_NAME) --update-env

# 重新构建（shared + server + web）后再重启，确保最新代码生效
pm2_redeploy:
	pnpm build
	WEB_ROOT=$(CURDIR)/packages/web/dist pm2 restart $(APP_NAME) --update-env

pm2_logs:
	pm2 logs $(APP_NAME)