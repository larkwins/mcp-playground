IMAGE ?= ccr.ccs.tencentyun.com/awesome/mcp-playground:latest
APP_NAME ?= mcp-playground

.PHONY: tag push pm2_start pm2_stop pm2_restart pm2_logs

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

pm2_logs:
	pm2 logs $(APP_NAME)