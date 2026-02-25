-- auto-generated definition
create table bpm_assignment_rule
(
    id             int auto_increment
        primary key,
    node_id        varchar(100) charset utf8 null,
    description    varchar(600) charset utf8 null,
    code           varchar(50) charset utf8  null,
    mapping_input  json                      null,
    mapping_output json                      null
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_config_link_node
(
    id           int auto_increment
        primary key,
    name         varchar(100) charset utf8 null,
    priority     int default 0             null comment 'Muc do uu tien (Thap thi cang cao, Cao thi cang thap',
    link_id      varchar(100) charset utf8 null,
    from_node_id varchar(100) charset utf8 not null,
    to_node_id   varchar(100) charset utf8 not null,
    updated_at   timestamp                 null,
    flow_type    varchar(20) charset utf8  null,
    config       text charset utf8         null,
    process_id   int                       not null,
    branch_id    int default 0             null,
    bsn_id       int default 0             null,
    constraint idx_bpm_config_link_node
        unique (from_node_id, to_node_id, process_id)
)
    engine = MyISAM;

create index Ref317336
    on bpm_config_link_node (process_id);

create index idx_link_from_node_id
    on bpm_config_link_node (from_node_id);

create index idx_link_process_id
    on bpm_config_link_node (process_id);

create index idx_link_to_node_id
    on bpm_config_link_node (to_node_id);

-- auto-generated definition
create table bpm_config_node
(
    node_id          varchar(100) charset utf8 not null
        primary key,
    type_node        varchar(100) charset utf8 null,
    name             varchar(300) charset utf8 null,
    created_at       timestamp                 null,
    updated_at       timestamp                 null,
    process_id       int                       not null,
    child_process_id int default 0             null comment 'Luu tru trong truong hop no la subprocess',
    workflow_id      int default 0             null comment 'No toi node nao',
    branch_id        int default 0             null,
    bsn_id           int default 0             null
)
    engine = MyISAM;

create index Ref317337
    on bpm_config_node (process_id);

-- auto-generated definition
create table bpm_form
(
    id              int auto_increment
        primary key,
    type            int default 0             null comment '0 - form thong thuong, 1 - form trinh, 2 - form phe duyet (tuan tu), 3 - form khoi tao, 4 - form phe duyet (song song)',
    code            varchar(100) charset utf8 null,
    name            varchar(300) charset utf8 null,
    config          text                      null comment 'Cau hinh xml cua form',
    config_timer    json                      null comment 'Thoi gian dung toi da tai node nay',
    validation_link varchar(300) charset utf8 null comment 'Xu ly xac thuc ngoai core',
    position        int                       null,
    form_id         int default 0             null,
    node_id         varchar(100) charset utf8 null,
    process_id      int default 0             null comment 'Phuc vu giam sat viec dat_ten form khong trung nhau trong 1 quy trinh',
    branch_id       int default 0             null,
    bsn_id          int default 0             null,
    constraint idx_bpm_form
        unique (process_id, code)
)
    engine = MyISAM;

-- auto-generated definition
create table bpm_form_data
(
    id              int auto_increment
        primary key,
    pot_id          int default 0             null,
    work_id         int default 0             null comment 'Du lieu form theo ca ho so/task viec',
    attribute_value json                      null comment 'Luu tru du lieu cua moi artifact',
    employee_id     int default 0             null,
    updated_time    timestamp                 null,
    node_id         varchar(100) charset utf8 null,
    constraint idx_bpm_form_data
        unique (node_id, pot_id, work_id)
)
    engine = MyISAM;

-- auto-generated definition
create table bpm_form_popup
(
    id              int auto_increment
        primary key,
    code            varchar(100) charset utf8 null,
    name            varchar(300) charset utf8 null,
    config          text                      null comment 'Cau hinh xml cua form',
    validation_link varchar(300) charset utf8 null comment 'Xu ly xac thuc ngoai core',
    position        int                       null,
    constraint idx_bpm_form_popup
        unique (code)
)
    engine = MyISAM;

-- auto-generated definition
create table bpm_form_tab
(
    id       int auto_increment
        primary key,
    name     varchar(100) charset utf8 not null,
    code     varchar(20) charset utf8  null,
    position int                       null,
    node_id  varchar(100) charset utf8 not null
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_jump
(
    id                 int auto_increment
        primary key,
    node_id            varchar(100) charset utf8mb4        null,
    employee_id        int                                 null,
    src_node_id        varchar(100) charset utf8mb4        null,
    src_employee_id    int                                 null,
    pot_id             int                                 null,
    process_id         int                                 null,
    type_jump          varchar(100) charset utf8mb4        null,
    rejection_chain_id int                                 null,
    created_time       timestamp default CURRENT_TIMESTAMP not null
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_node_pointer
(
    id         int auto_increment
        primary key,
    node_id    varchar(100) charset utf8 null,
    pot_id     int default 0             null,
    is_pointer int default 1             null
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_object
(
    id           int auto_increment
        primary key,
    process_id   int       not null,
    group_id     int       not null,
    employee_id  int       null,
    created_time timestamp null,
    constraint idx_bpm_object
        unique (process_id)
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_participant
(
    id             int auto_increment
        primary key,
    type           int default 0             null comment '0 - assign normal, 1 - assign team, 2 - assign from var/form',
    department     varchar(100) charset utf8 null comment 'La ID hoac var/form',
    jte            varchar(100) charset utf8 null comment 'La ID hoac var/form',
    employee       varchar(100) charset utf8 null comment 'La ID hoac var/form',
    team_id        int default 0             null comment 'La ID cua nhom',
    team_member    int default 0             null comment 'La ID employee trong nhom (neu chi dinh)',
    department_id  int                       null,
    jte_id         int default 0             null,
    employee_id    int                       null,
    field_name     varchar(50) charset utf8  null comment 'Chua var hoac frm',
    field_process  int default 0             null comment '1 - song song, 2 - tuan tu',
    field_asignees json                      null comment 'Nguoi thuc hien',
    created_time   timestamp                 null,
    creator_id     int default 0             null,
    form_id        int default 0             null,
    node_id        varchar(100) charset utf8 null,
    workflow_id    int default 0             null,
    bsn_id         int default 0             null
)
    engine = MyISAM;

-- auto-generated definition
create table bpm_participant_seq
(
    id           int auto_increment
        primary key,
    node_id      varchar(100) charset utf8 null,
    pot_id       int default 0             null,
    employee_id  int default 0             null,
    level        varchar(10) charset utf8  null,
    position     int default 0             null,
    iteration    int                       null,
    is_processed int default 0             null,
    is_returned  int default 0             null comment '1 - bi tra ve, 0 - binh thuong',
    is_returner  int default 0             null comment '1 - la tac nhan tra ve, 0 - binh thuong',
    updated_time timestamp                 null,
    context_data json                      null comment 'Thong tin ngu canh',
    constraint idx_bpm_participant_seq
        unique (node_id, pot_id, employee_id, is_returned)
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_pot_init
(
    id           int auto_increment
        primary key,
    request_id   varchar(50) charset utf8 null,
    pot_id       int                      null,
    form_action  varchar(10) charset utf8 null,
    created_time timestamp                null,
    constraint idx_bpm_pot_init
        unique (pot_id)
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_process_terminate
(
    id              int auto_increment
        primary key,
    process_id      int                                 null,
    pot_id          int                                 null,
    node_id         varchar(100)                        null,
    terminate_scope int                                 null,
    reason          text                                null,
    created_at      timestamp default CURRENT_TIMESTAMP not null
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_request_submitter
(
    id              int auto_increment
        primary key,
    process_id      int default 0 null comment 'Quy trinh goc root',
    pot_id          int default 0 null,
    creator_id      int default 0 null,
    creator_time    timestamp     null,
    submitter       int default 0 null comment 'Nguoi trinh ho so',
    submission_time timestamp     null,
    priority_level  int default 0 null comment '1) Thap
2) Trung binh
3) Cao
4) Rat cao',
    context_data    json          null comment 'Thong tin du lieu mo rong cua h/s (dung mo rong work_order)',
    constraint idx_bpm_request_submitter
        unique (pot_id)
)
    engine = InnoDB;

-- auto-generated definition
create table bpm_trigger
(
    id              int auto_increment
        primary key,
    from_node_id    varchar(100) charset utf8 null,
    to_node_id      varchar(100) charset utf8 null,
    pot_id          int default 0             null comment 'ID doi tuong can chay',
    employee_id     int default 0             null comment 'Nguoi kich hoat (UserTask) - Truong hop submit tu form. Day la thong tin bo tro',
    request_id      varchar(100) charset utf8 null,
    root_request_id varchar(50) charset utf8  null,
    created_time    timestamp                 null,
    status          int default 0             null comment '0 - cho xu ly, 1 - dung cho tac nhan ngoai (nguoi xu ly hoac tien trinh ngoai), 2 - da hoan thanh',
    message_error   varchar(600) charset utf8 null,
    gateway         varchar(10) charset utf8  null comment 'Trang thai PARALLEL, INCLUSIVE, EXCLUSIVE',
    process_id      int                       not null,
    branch_id       int default 0             null,
    bsn_id          int default 0             null
)
    engine = InnoDB
    charset = latin1;

create index idx_bpm_trigger
    on bpm_trigger (pot_id);

