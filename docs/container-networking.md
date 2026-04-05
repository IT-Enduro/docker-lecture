---
id: container-networking
title: Взаимодействие контейнеров по сети
sidebar_position: 6
---

При запуске Docker процесса, он создает новый виртуального интерфейс типа bridge с названием `docker0` в host-системе.
Этот интерфейс позволяет docker создать виртуальную подсеть для использования контейнерами, которые он будет запускать.
Мост будет служить основной точкой взаимодействия между сетью внутри контейнера и сетью хоста.

Когда Docker запускает контейнер, создается новый виртуальный интерфейс и ему назначается адрес в диапазоне подсети
моста. IP-адрес связан с внутренней сетью контейнера, предоставляя путь для сети контейнера к мосту `docker0` на системе
хоста. Docker автоматически конфигурирует правила в `iptables` для обеспечения переадресации и конфигурирует NAT для
трафика из `docker0` во внешнюю сеть.

![docker0](/images/docker0.png)

## Проброс портов

* Открытие порта (`EXPOSE`) информирует docker, что данный порт используется контейнером. Эта информация, например,
  доступна в `docker inspect --format '{{json .NetworkSettings.Ports }}' <container>`.
* Публикация порта (`-p 8080:8080`) пробрасывает порт на интерфейс хоста, делая его доступным для внешнего мира.

## Коммуникация между контейнерами

Для взаимодействия между контейнерами нужно создать между ними сеть. Есть несколько основных видов сетей:

* `bridge` – сеть типа мост для взаимодействия между контейнерами.
    * По-умолчанию, docker создает дефолтную `bridge` сеть между всеми контейнерами, но она не предоставляет resolv DNS,
      соответственно, общение между контейнерами требуется выполнять с помощью ip-адресов (`--link` deprecated).
    * Если создается user-defined сеть, то внутри можно обращаться по имени контейнера (DNS resolution).
* `host` – монтируется на сеть host-машины, порты внутри контейнера аллоцируются сразу на host машине. Работает только
  на Linux и не поддерживается Docker for Desktop for Mac, Docker Desktop for Windows.
* `macvlan` – docker host принимает запросы на несколько MAC-адресов по своему ip-адресу и направляют эти запросы в
  соответствующий контейнер.
* `overlay` – создает покрывающую сеть между несколькими машинами с docker. Используется в Kubernetes.

Дефолтная `bridge` сеть имеет ряд существенных недостатков, поэтому для взаимодействия контейнеров стоит всегда
создавать отдельные сети, включающие только необходимые контейнеры. Контейнеры могут подключаться и отключаться от сети
на лету.

```shell
$ docker pull romanowalex/echo-server:v2.0

$ docker network create --driver bridge common

$ docker network ls
NETWORK ID     NAME      DRIVER    SCOPE
58a6e614b3a8   bridge                bridge    local
590e8b94c17e   host                  host      local
023f4b24772f   none                  null      local
340fa41db593   common      bridge    local

# запускаем server-1 на порту 8081
$ docker run -d \
  -p 8081:8080 \
  --network common \
  --name server-1 \
  romanowalex/echo-server:v2.0

# запускаем server-2 на порту 8082
$ docker run -d \
  -p 8082:8080 \
  --network common \
  --name server-2 \
  romanowalex/echo-server:v2.0

$ docker inspect -f "{{json .NetworkSettings.Networks }}" server-1 | jq
{
  "common": {
    "Aliases": [
      "5b979ce14143"
    ],
    "Gateway": "172.23.0.1",
    "IPAddress": "172.23.0.2",
    "IPPrefixLen": 16,
    "MacAddress": "02:42:ac:17:00:02",
  }
}

# запускаем логи server-1
$ docker logs -f server-1

# заходим внутрь образа server-2
$ docker exec -it server-2 /bin/bash

# выполняем запрос к server-1
$ curl -X POST http://server-1:8080 -d 'message="Hello from server-2"'

```

## Пример

```shell
$ docker volume create pg-data
$ docker network create --driver bridge common

$ docker run -d \
    --name postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=services \
    --network common \
    --volume pg-data:/var/lib/postgresql/data \
    --volume $(pwd)/postgres:/docker-entrypoint-initdb.d/ \
    postgres:15

$ docker run -d \
    --name backend-todo-list \
    --network common \
    -e SPRING_PROFILES_ACTIVE=docker \
    -e OAUTH2_SECURITY_ENABLED=false \
    romanowalex/backend-todo-list:v2.1

$ docker run -d \
    -p 3000:80 \
    --name frontend-todo-list \
    --network common \
    -e BACKEND_HOST=backend-todo-list \
    romanowalex/frontend-todo-list:v2.0
```

Приложение доступно по адресу [localhost:3000](http://localhost:3000).

## Healthcheck

Инструкция `HEALTHCHECK` сообщает Docker, как протестировать контейнер, чтобы убедиться, что он работает.

* `interval` – интервал между проверками (когда предыдущая проверка закончилась);
* `timeout` – таймаут, после которого проверка считается неудачной;
* `start-period` – время на инициализацию контейнера, проверки, которые неудачно завершились за этот период не
  учитываются в общем количестве попыток.
* `retries` – количество попыток, прежде чем пометить контейнер как `unhealthy`. Если при запуске указан
  флаг `--restart on-failure|always|uless-stopped`, то контейнер будет перезапущен.

Без указания `HEALTHCHECK` Docker ориентируется по ненулевому exit code контейнера.
