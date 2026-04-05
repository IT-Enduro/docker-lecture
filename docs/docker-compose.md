---
id: docker-compose
title: Docker Compose
sidebar_position: 8
---

Docker Compose — это инструментальное средство, входящее в состав Docker. Оно предназначено для решения задач, связанных
с развёртыванием проектов. Технология Docker Compose, позволяет, с помощью одной команды, запускать множество сервисов.

Docker применяется для управления отдельными контейнерами (сервисами), из которых состоит приложение.

Docker Compose используется для одновременного управления несколькими контейнерами, входящими в состав приложения. Этот
инструмент предлагает те же возможности, что и Docker, но позволяет работать с более сложными приложениями.

Docker Compose по умолчанию создает `bridge` между контейнерами, соответственно docker поднимает DNS resolve и
контейнеры могут общаться друг к другу по имени.

Файл примера: [
`examples/docker-compose.yml`](https://github.com/it-enduro/docker-lecture/blob/master/examples/docker-compose.yml)

```shell
# сборка docker образов (если прописан блок build)
$ docker compose build

# публикация docker в Container Registry (в имени образа прописывается namespace)
$ docker compose push

# запуск всех образов
$ docker compose up -d --wait
[+] Running 4/5
 ⠿ Network examples_default      Created                       0.0s
 ⠿ Volume "examples_db-data"     Created                       0.0s
 ⠿ Container postgres            Healthy                       11.0s
 ⠿ Container backend-todo-list   Waiting                       20.4s
 ⠿ Container frontend-todo-list  Created                       32.5s

# остановка, старт и рестарт сервисов
$ docker compose start/stop/restart

# остановка всех сервисов и удаление volume
$ docker compose down --volumes
[+] Running 3/3
 ⠿ Container simple-frontend  Removed                                                                                                                                                     0.2s
 ⠿ Container simple-backend   Removed                                                                                                                                                     0.3s
 ⠿ Network examples_default   Removed

# просмотр какой порт проброшен наружу для порта 80 внутри контейнера
$ docker compose port frontend-todo-list 80
0.0.0.0:80
```

Compose автоматически создает сеть проекта и DNS resolve по именам сервисов, поэтому backend может обратиться к postgres
по имени сервиса, а не по IP.
