IMAGE ?= ccr.ccs.tencentyun.com/awesome/mcp-playground:latest

.PHONY: tag push

tag:
	docker build -t $(IMAGE) .

push:
	docker push $(IMAGE)
