---
id: docker-swarm
title: Docker Swarm
sidebar_position: 9
---

Docker Swarm — встроенный оркестратор Docker для кластера из нескольких хостов.

## Основные понятия

- **Manager**: управляет состоянием кластера, планированием сервисов и Raft-кворумом;
- **Worker**: выполняет задачи (tasks) сервисов;
- **Service**: декларативное описание желаемого состояния (образ, число реплик, порты, сети);
- **Overlay network**: сеть между узлами кластера.

## Базовый сценарий

```bash
# инициализация кластера
$ docker swarm init

# деплой сервиса с 3 репликами
$ docker service create \
  --name web \
  --replicas 3 \
  -p 8080:80 \
  nginx:alpine

# масштабирование
$ docker service scale web=5

# список сервисов и задач
$ docker service ls
$ docker service ps web
```

Swarm удобен для знакомства с оркестрацией и небольших кластеров, но в крупных production-средах чаще используют
Kubernetes.
