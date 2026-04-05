---
id: docker-cli-commands
title: Основные команды Docker CLI
sidebar_position: 4
---

Ниже базовый набор команд для ежедневной работы.

```shell
# установка подсказок для командной строки
docker completion fish > ~/.config/fish/completions/docker.fish

# сборка образа ping в папке example/
$ docker build examples/ -t my-ping:v1.0

# запуск контейнера
$ docker run --name my-ping my-ping:v1.0

# запуск контейнера с аргументами
$ docker run --name my-ping -d my-ping:v1.0 ya.ru

# вывод логов контейнера
$ docker logs -f my-ping

# остановка, старт и рестарт контейнера
$ docker stop --time=2 my-ping
$ docker start my-ping
$ docker restart --time=2 my-ping

# вывод всех образов
$ docker images

# просмотр запущенных контейнеров
$ docker ps

# просмотр всех контейнеров
$ docker ps -a

# просмотр всех сведение о контейнере
$ docker inspect my-ping

# получение внутреннего ip-адреса контейнера
$ docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-ping

# получение пути к папке с логами контейнера
$ docker inspect --format='{{.LogPath}}' my-ping

# получение информации об используемом образе
$ docker inspect --format='{{.Config.Image}}' my-ping

# заход внутрь образа
$ docker exec -it my-ping /bin/bash

# показать запущенные процессы в контейнере
$ docker top my-ping

# информация о потребляемых ресурсах docker
$ docker stats

# удаление контейнера postgres
$ docker rm -f my-ping

# удаление образа my-ping:v1.0
$ docker rmi my-ping:v1.0
```

Пример запуска PostgreSQL:

```bash
# запустить контейнер postgres:15 на порту 5432 и создать пользователя test:test и базу example
$ docker run \
    --name postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=test \
    -e POSTGRES_PASSWORD=test \
    -e POSTGRES_DB=services \
    postgres:15
```
