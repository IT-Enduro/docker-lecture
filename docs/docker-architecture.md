---
id: docker-architecture
title: Архитектура Docker
sidebar_position: 3
---

Docker - это средство виртуализации, одно из назначений которого виртуализация рабочих сред на серверах. Также он
предоставляет универсальный способ доставки приложений на машины (локальный компьютер или удаленные сервера) и их
запуска в изолированном окружении.

Основные понятия:

* Образ (Image) — это read-only шаблон для создания Docker-контейнеров. Представляет собой исполняемый пакет, содержащий
  все необходимое для запуска приложения: код, среду выполнения, библиотеки, переменные окружения и файлы конфигурации.
  Docker-образ состоит из слоев. Каждое изменение записывается в новый слой.
* Контейнер (Container) — запущенный процесс операционной системы в изолированном окружении с подключенной файловой
  системой из образа.

Контейнер — всего лишь обычный процесс операционной системы. Разница лишь в том, что благодаря возможностям ядра, docker
стартует процесс в изолированном окружении. Контейнер видит свой собственный список процессов, свою собственную сеть,
свою собственную файловую систему и т.д. Пока ему не укажут явно, он не может взаимодействовать с вашей основной
операционной системой и всем, что в ней хранится или запущено.

Docker использует архитектуру клиент-сервер: клиент общается с Docker Daemon, который берет на себя задачи
создания, запуска, распределения контейнеров. Клиент и сервер общаются через сокет (по-умолчанию) или через REST API.

![Docker Engine](/images/Docker%20Engine.png)

Docker Engine — ядро механизма Docker, он отвечает за функционирование и обеспечение связи между основными
объектами:

* серверный процесс-демон `dockerd`: создает и управляет объектами Docker, такими как образы, контейнеры, сети и
  volumes;
* API, через который программы могут взаимодействовать с демоном Docker.
* CLI клиент для Docker.

## Namespaces

Namespaces – это механизм ядра Linux, обеспечивающий изоляцию процессов друг от друга. Включает в себя:

* network – предоставляет контейнеру свое представление сетевого стека (interfaces, routing tables, network devices, и
  т.д.);
* mounts – точки монтирования;
* UTS – Unix Timeshare System, позволяет процессам иметь свои системные идентификаторы hostname и NIS domain name,
  отличные от других контейнеров и host-машины;
* user – изоляция пользователей внутри контейнера;
* IPC – InterProcess Communication, ответственна за изоляцию ресурсов между процессами внутри контейнера.

![namespaces](/images/Namespaces.png)

## CGroups

Docker использует технологию ядра Linux cgroups (Control Groups), которая изолирует, приоритизирует и выдает квоты на
использование ресурсов системы для группы процессов. С помощью этой технологии контейнеры docker получают только те
ресурсы, которые были ему выделены.

![cgroups](/images/CGroups.png)

## Использование Docker в Kubernetes

В Kubernetes для работы с container runtime использует Container Runtime Interface, при этом весь код взаимодействия с
контейнерами выполняется через CRI. Docker не поддерживает CRI напрямую, поэтому kubelet включает компонент под
названием `dockershim`, который транслирует команды из CRI в docker.

![Docker in Kubernetes](/images/Docker%20in%20Kubernetes.png)

Начиная с версии 1.22 Kubernetes отказываются от поддержки `dockershim`, соответственно, Docker и будет работать только
с Container Runtime, поддерживающими Container Runtime Interface (CRI) — `containerd` или `CRI-O`.

Но это не означает, что Kubernetes не сможет запускать контейнеры из Docker образов. И `containerd`, и `CRI-O` могут
запускать образы в формате Docker (фактически в формате OCI), они просто делают это без использования команды docker и
Docker Daemon.

![Containerd CRI0 runc](/images/Containerd%20CRI0%20runc.png)

## Структура образа

Образ состоит из слоев, каждый из которых представляет собой неизменяемую файловую систему, а по-простому набор файлов и
директорий. Образ в целом представляет собой объединенную файловую систему (Union File System), которую можно
рассматривать как результат слияния файловых систем слоев. Объединенная файловая система умеет обрабатывать конфликты,
например, когда в разных слоях присутствуют файлы и директории с одинаковыми именами. Каждый следующий слой добавляет
или удаляет какие-то файлы из предыдущих слоев. В данном контексте _удаляет_ можно рассматривать как _затирает_, т.е.
файл в нижележащем слое остается, но его не будет видно в объединенной файловой системе.

Главное различие между контейнером и образом – это верхний writable-слой. Все операции модификации хранятся в этом слое.
Когда контейнер удаляется, этот слой тоже удаляется, а предыдущие слои не изменяются.

![Image Layers](/images/Image%20Layers.png)

Поскольку у каждого контейнера есть собственный writable-слов, где хранятся все изменения, несколько контейнеров могут
совместно использовать доступ к одному и тому же базовому образу и при этом иметь собственное состояние данных.

```shell
$ docker ps -s
CONTAINER ID   IMAGE                                NAMES                SIZE
85b33aa51fd7   romanowalex/frontend-todo-list:v2.0  frontend-todo-list   643B (virtual 144MB)
de6e26c58235   romanowalex/backend-todo-list:v2.1   backend-todo-list    32.8kB (virtual 536MB)
1b96a3ea4ec2   postgres:15                          postgres             63B (virtual 425MB)

```

* size – объем на диске, который используется для writable-слоя;
* virtual size – объем на диске, который используется для read-only слоев плюс writable-слой.

## Docker filesystem

OverlayFS сливает два каталога и представляет их как один каталог, эти каталоги называются слоям. OverlayFS обращается к
нижнему каталогу как к _lower_, а к верхнему каталогу — как к _upper_. Унифицированное представление доступно через
собственный каталог, который называется _merged_.

В папке `/var/lib/docker/overlay2` слови представлены папками, в папке `l` хранятся коротки ссылки на папки (_diff_) для
использования в команде mount. В каждом образе хранится (кроме базового, там только _link_ и _diff_):

* _link_ – файл, который содержит короткое имя директории из папки _l_;
* _lower_ – файл, который ссылается на короткое имя родителя;
* _diff_ – директория, которая содержит данные самого образа;
* _merged_ – актуальный контент этого образа (слитый с родительским _diff_);
* _work_ – для внутреннего использования в OverlayFS.

![Overlay2 Merge](/images/Overlay2%20Merge.png)

У каждого слоя изображения есть собственный каталог в `/var/lib/docker/overlay/`, который содержит его содержимое.
(LayerID != directory ID)

Начиная с версии Docker 1.10 образы и слои, больше не являются синонимами. Вместо этого образ напрямую ссылается на один
или больше слоев, которые в конечном итоге сливаются в файловую систему контейнера.

Слои теперь идентифицируются hash, который имеет форму `<тип алгоритма>:<hash>`. Значение вычисляется путем применения
алгоритма (sha256) к содержимому слоя. Если содержимое изменится, то вычисленный hash также изменится, а это означает,
что Docker может сверить полученное содержимое слоя с его опубликованным hash, чтобы проверить его содержимое. Слои не
имеют представления о принадлежности к образу, они представляют собой просто наборы файлов и каталогов.

Слои хранятся внутри аналогично образам. Они описываются в каталоге `/lib/docker/image/overlay2/layerdb/sha256/` и
содержат связку между directory ID и LayerID. Каждая из директорий содержит следующие файлы:

* _diff_ – содержит hash слоя (может не совпадать с именем директории);
* _size_ – физический размер слоя;
* _cache-id_ – содержит directory ID.

```shell
$ vagrant up
$ ssh ansible@192.168.56.100

$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
$ sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
$ sudo apt-get update
$ sudo apt-get install -y jq docker-ce docker-ce-cli containerd.io docker-compose-plugin

$ sudo usermod -aG docker ansible

$ ssh ansible@192.168.56.100

$ docker run hello-world

$ wget -O /tmp/dive.deb https://github.com/wagoodman/dive/releases/download/v0.12.0/dive_0.12.0_linux_amd64.deb
$ sudo apt install /tmp/dive.deb

$ docker pull postgres:15-alpine

$ docker image inspect --format "{{json .RootFS.Layers}}" postgres:15-alpine | jq
[
  "sha256:994393dc58e7931862558d06e46aa2bb17487044f670f310dffe1d24e4d1eec7",
  "sha256:c107d84c5ee5434184266dd999ba59186dbe34ef4c6d1464f2ddd742f5eaa7f8",
  "sha256:1191ff7875541dfd09e2f07b69b294d01cae17d396860e2d255308cb4ee9de5f",
  "sha256:cd27e8fe70814af54c1320fcb6f9395589188c1af202d784dc09fd2fe0c5d9ec",
  "sha256:a1d3de8ff553b04e12df7068c99d824a9f860947d306feee9200a14127fd9a0b",
  "sha256:c299f2771a0f2ac5f22deb1008c32c58fef5fa24bb11ed5a23b63def5887b798",
  "sha256:e90d97e0fb0c12656fa4a7f9629c28d53065d2478a1dcbe79ae7b5eb0eb53e8e",
  "sha256:86565deff7509eb519ca0cce06484f6d6dcdabd50c2b3995768c27cccc1301c9"
]

# Данные лежат в слоев лежат в /var/lib/docker/overlay2/
$ ls -l /var/lib/docker/overlay2/
drwx--x--- 4 root root 4.0K Nov  5 20:42 1a2482afeba6d95a6d6dfd3d6a22bfdfddca75595c9df597b55dd76823873c33/
drwx--x--- 4 root root 4.0K Nov  5 20:42 1a2482afeba6d95a6d6dfd3d6a22bfdfddca75595c9df597b55dd76823873c33-init/
drwx--x--- 4 root root 4.0K Nov  5 20:43 3030da422b0e202b27ef1dacbcb9cfc16bb737573e8d30e1d3b4a2e7dc9b101c/
drwx--x--- 4 root root 4.0K Nov  5 20:43 3030da422b0e202b27ef1dacbcb9cfc16bb737573e8d30e1d3b4a2e7dc9b101c-init/
drwx--x--- 4 root root 4.0K Nov  6 05:55 56eea650bd4855676c0c57405d351bcfa804704317ee503308150eaabaad3a34/
drwx--x--- 4 root root 4.0K Nov  5 21:07 56eea650bd4855676c0c57405d351bcfa804704317ee503308150eaabaad3a34-init/
drwx--x--- 4 root root 4.0K Nov  5 21:01 731c1ef12f136de868b6c76fd3b6a3e055ac5f3817516927a1f389ee88d93a0e/
drwx--x--- 4 root root 4.0K Nov  5 21:01 873a8c55cf4f368f397889035599c1b5fbe87dd48bb3cead653f73ed5305959b/
drwx--x--- 4 root root 4.0K Nov  5 21:05 969c6ca1a5d0caf4aab84d89de31a4dd017f27be18adea13db70c6e480efc3cb/
drwx--x--- 3 root root 4.0K Nov  5 21:01 9e6909cf6f857a19e27ca5e054dbfbd8c3d26f861e88213c4c697b3db9d4fd8f/
drwx--x--- 4 root root 4.0K Nov  5 21:01 ab11108080f9d6f64382bc8969e27fa37f3dc523c9b66b0e15ab9c3be2c19671/
drwx--x--- 4 root root 4.0K Nov  5 21:01 c6916816315ab081b673254e528ff02decb8111b88eacd4a118cf856ab47e281/
drwx--x--- 3 root root 4.0K Nov  5 20:42 d3d6fbdac894d1c6b038bc4141b4bfbc46a54b6da16f79f198b14b11286234dc/
drwx--x--- 4 root root 4.0K Nov  5 21:01 d8ce16555aa3ffa154c7b84f99138cbde317f447f3fde3289f5045a3490498dc/
drwx--x--- 4 root root 4.0K Nov  5 21:05 e5ae3537d4efe5213b6677bbeb6f6b3c4c4106d66f95546794dbc2b5456e79b6/
drwx--x--- 4 root root 4.0K Nov  5 21:05 e5ae3537d4efe5213b6677bbeb6f6b3c4c4106d66f95546794dbc2b5456e79b6-init/
drwx--x--- 4 root root 4.0K Nov  5 21:01 ee3adbd629acc5fc5bbd69bd968862f9f8bcb3e5627436d6925b287a354f19d3/
drwx------ 2 root root 4.0K Nov  5 21:08 l/

# в папке l хранятся коротки ссылки на папки (diff) для использования в команде mount
$ ls -l /var/lib/docker/overlay2/l/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 2V5VOYBYTBNSA2LGE3UMSOR7KL -> ../ab11108080f9d6f64382bc8969e27fa37f3dc523c9b66b0e15ab9c3be2c19671/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 5BC5KJ4XT3Z25IMQVCLEULG5XT -> ../c6916816315ab081b673254e528ff02decb8111b88eacd4a118cf856ab47e281/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:05 CD5DVCWGE6R4XFPPQASG5JXSR4 -> ../e5ae3537d4efe5213b6677bbeb6f6b3c4c4106d66f95546794dbc2b5456e79b6/diff/
lrwxrwxrwx 1 root root 77 Nov  5 20:43 EGOL3MVQVAQHO5VN5LPFWTICCU -> ../3030da422b0e202b27ef1dacbcb9cfc16bb737573e8d30e1d3b4a2e7dc9b101c-init/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 GV2ZGRDPJPTPDWPETTXTBGHPLB -> ../9e6909cf6f857a19e27ca5e054dbfbd8c3d26f861e88213c4c697b3db9d4fd8f/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 HJ4S43EUDKOXIKA4UPJYW5FW4B -> ../ee3adbd629acc5fc5bbd69bd968862f9f8bcb3e5627436d6925b287a354f19d3/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 IJUGCX5ETVC2DLOUJZLVT44QFI -> ../731c1ef12f136de868b6c76fd3b6a3e055ac5f3817516927a1f389ee88d93a0e/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 KPG2WP2WSKTRNZZICBTZJGNDZ4 -> ../d8ce16555aa3ffa154c7b84f99138cbde317f447f3fde3289f5045a3490498dc/diff/
lrwxrwxrwx 1 root root 72 Nov  5 20:42 Q332M2GWS72CS3PAV5T62RHEMK -> ../d3d6fbdac894d1c6b038bc4141b4bfbc46a54b6da16f79f198b14b11286234dc/diff/
lrwxrwxrwx 1 root root 77 Nov  5 21:07 R7AIIRLLWCQRG77JZAGVC73U77 -> ../56eea650bd4855676c0c57405d351bcfa804704317ee503308150eaabaad3a34-init/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 RPJLXSMMDMKUNBYIRDG72BXX6E -> ../873a8c55cf4f368f397889035599c1b5fbe87dd48bb3cead653f73ed5305959b/diff/
lrwxrwxrwx 1 root root 77 Nov  5 21:05 RS4ISVS5WKY6U4Y2YYTNRS43RO -> ../e5ae3537d4efe5213b6677bbeb6f6b3c4c4106d66f95546794dbc2b5456e79b6-init/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:07 S63HBRFNHNFMRAPOKGCGHP67OP -> ../56eea650bd4855676c0c57405d351bcfa804704317ee503308150eaabaad3a34/diff/
lrwxrwxrwx 1 root root 77 Nov  5 20:42 SPLVF4QNHKGJMGGGNMOLIDSZLS -> ../1a2482afeba6d95a6d6dfd3d6a22bfdfddca75595c9df597b55dd76823873c33-init/diff/
lrwxrwxrwx 1 root root 72 Nov  5 20:43 TWD5VJVTPWLAOITTZVWT3XQBHS -> ../3030da422b0e202b27ef1dacbcb9cfc16bb737573e8d30e1d3b4a2e7dc9b101c/diff/
lrwxrwxrwx 1 root root 72 Nov  5 20:42 VCAQCPQMQJI5ME6462LM5SASIY -> ../1a2482afeba6d95a6d6dfd3d6a22bfdfddca75595c9df597b55dd76823873c33/diff/
lrwxrwxrwx 1 root root 72 Nov  5 21:01 Y4GTDIJ5VVUDIO2JO4SX2U6PG2 -> ../969c6ca1a5d0caf4aab84d89de31a4dd017f27be18adea13db70c6e480efc3cb/diff/

# LayerID не равен directory ID, их связка (sha256) хранится в /var/lib/docker/image/overlay2/layerdb/sha256/
$ ls -al /var/lib/docker/image/overlay2/layerdb/sha256/
drwx------  2 root root 4096 Nov  5 21:01 070c03fccb2906f60ec43569980287814802f7d0b2d3dcc714bc5ef1c86f373a/
drwx------  2 root root 4096 Nov  5 21:01 12ecc7f7b876721f4d958e20fc3c1c7d9227508c62d903ade63e199f0f0280ce/
drwx------  2 root root 4096 Nov  5 21:01 4dab68415bc6bc7655ecb95fb07e1d593903fc053820b165a9f36d3711f02806/
drwx------  2 root root 4096 Nov  5 21:01 88af384590de04a47b9b659583ea4852f8a6cfae0660b2985f64fa3296b4c400/
drwx------  2 root root 4096 Nov  5 21:01 8b92637bd54864bdd672e0b4f90143663aec23aa25a8265391d039c39efcf30f/
drwx------  2 root root 4096 Nov  5 21:01 934d24deeb153a2ca4f24035b3b9aeb42b265108a35ca74d52782fe84ff031d1/
drwx------  2 root root 4096 Nov  5 21:01 994393dc58e7931862558d06e46aa2bb17487044f670f310dffe1d24e4d1eec7/
drwx------  2 root root 4096 Nov  5 21:01 ad2999dcc3a48c967d0d5a498b564c3c93bb2c45c5403d70d42fe763283d13c4/
drwx------  2 root root 4096 Nov  5 20:42 e07ee1baac5fae6a26f30cabfe54a36d3402f96afda318fe0a96cec4ca393359/

# ищем слой 86565deff, где хранится docker-entrypoint.sh:
# * в diff хранится sha слоя;
# * в cache-id хранится папка /var/lib/docker/overlay2/.
$ grep -RI '86565deff7509eb519ca0cce06484f6d6dcdabd50c2b3995768c27cccc1301c9' .
./4dab68415bc6bc7655ecb95fb07e1d593903fc053820b165a9f36d3711f02806/diff:sha256:86565deff7509eb519ca0cce06484f6d6dcdabd50c2b3995768c27cccc1301c9

$ cd 4dab68415bc6bc7655ecb95fb07e1d593903fc053820b165a9f36d3711f02806/

$ ls -l
-rw-r--r-- 1 root root  64 Nov  5 21:01 cache-id
-rw-r--r-- 1 root root  71 Nov  5 21:01 diff
-rw-r--r-- 1 root root  71 Nov  5 21:01 parent
-rw-r--r-- 1 root root   5 Nov  5 21:01 size

$ cat diff
sha256:86565deff7509eb519ca0cce06484f6d6dcdabd50c2b3995768c27cccc1301c9

$ cat cache-id
969c6ca1a5d0caf4aab84d89de31a4dd017f27be18adea13db70c6e480efc3cb

$ cd /var/lib/docker/overlay2/969c6ca1a5d0caf4aab84d89de31a4dd017f27be18adea13db70c6e480efc3cb

$ ls -l
-rw------- 1 root root    0 Nov  5 21:07 committed
drwxr-xr-x 3 root root 4.0K Nov  5 21:01 diff/
-rw-r--r-- 1 root root   26 Nov  5 21:01 link
-rw-r--r-- 1 root root  202 Nov  5 21:01 lower
drwx------ 2 root root 4.0K Nov  5 21:01 work/

$ ls -al diff/usr/local/bin/
-rwxrwxr-x 1 root root 12K Oct  7 01:17 docker-entrypoint.sh*
```

Для просмотра слоев контейнера удобно использовать утилиту [dive](https://github.com/wagoodman/dive).
