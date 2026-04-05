---
id: volumes
title: Volumes
sidebar_position: 7
---

Для хранения данных между перезапусками контейнеров используется абстракция, называемая volume.

Для подключения конфигурационных файлов или добавления информации внутрь контейнера можно примонтировать папку с
host-машины: `--volume $(pwd)/postgres:/docker-entrypoint-initdb.d/`.

Для персистентного хранения данных лучше создать Volume и примонтировать его при запуске
контейнера `--volume pg-data:/var/lib/postgresql/data`.

```shell
$ docker volume create pg-data
$ docker volume ls
local     pg-data

$ docker volume inspect pg-data
[
    {
        "CreatedAt": "2024-06-13T20:17:12Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/pg-data/_data",
        "Name": "pg-data",
        "Options": {},
        "Scope": "local"
    }
]

$ docker run -d \
    --name postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=program \
    -e POSTGRES_PASSWORD=test \
    -e POSTGRES_DB=services \
    --volume pg-data:/var/lib/postgresql/data \
    postgres:15

$ psql -h localhost -p 5432 -U program services
>> CREATE TABLE items (id SERIAL PRIMARY KEY, name VARCHAR NOT NULL);
>> INSERT INTO items(name) VALUES ('test');

$ docker rm -f postgres
$ docker run -d \
    --name postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=program \
    -e POSTGRES_PASSWORD=test \
    -e POSTGRES_DB=services \
    --volume pg-data:/var/lib/postgresql/data \
    postgres:15

$ psql -h localhost -p 5432 -U program services
>> SELECT * FROM items;
 id | name
----+------
  1 | test
(1 row)

```

## Оптимизация размера образа

Образ — это не что иное, как коллекция других образов, можно прийти к очевидному выводу: размер образа равен сумме
размеров образов, его составляющих.

```shell
$ docker history my-ping:v1.0
IMAGE          CREATED        CREATED BY                                      SIZE      COMMENT
be17399a7548   10 days ago    CMD ["google.com"]                              0B        buildkit.dockerfile.v0
<missing>      10 days ago    ENTRYPOINT ["/bin/ping"]                        0B        buildkit.dockerfile.v0
<missing>      10 days ago    RUN /bin/sh -c apt-get update     && apt-get…   59.3MB    buildkit.dockerfile.v0
<missing>      8 months ago   /bin/sh -c #(nop)  CMD ["/bin/bash"]            0B
<missing>      8 months ago   /bin/sh -c #(nop) ADD file:63d5ab3ef0aab308c…   77.8MB
<missing>      8 months ago   /bin/sh -c #(nop)  LABEL org.opencontainers.…   0B
<missing>      8 months ago   /bin/sh -c #(nop)  LABEL org.opencontainers.…   0B
<missing>      8 months ago   /bin/sh -c #(nop)  ARG LAUNCHPAD_BUILD_ARCH     0B
<missing>      8 months ago   /bin/sh -c #(nop)  ARG RELEASE                  0B

```

Каждая дополнительная инструкция в Dockerfile будет только увеличивать общий размер образа. Соответственно, чтобы
уменьшить результирующий размер образа:

* нужно объединять однотипные команды;
* использовать максимально компактный базовый образ, например на базе [Alpine Linux](https://hub.docker.com/_/alpine);
* использовать multistage build, чтобы не тащить в результирующий образ лишнее.
* использовать `.dockerignore`, чтобы исключить лишние файлы из сборки (синтаксис аналогичен .gitignore).
