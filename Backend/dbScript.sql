-- public.user_login definition

-- Drop table

-- DROP TABLE user_login;

CREATE TABLE user_login (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    email TEXT NOT NULL,
    pwd TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT user_login_email_check CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    UNIQUE (email)
);


-- public."document" definition

-- Drop table

-- DROP TABLE "document";

CREATE TABLE "document" (
document_id serial4 NOT NULL,
document_title varchar(255) NOT NULL,
pdf_content bytea NOT NULL,
user_id int4 NOT NULL,
CONSTRAINT document_pkey PRIMARY KEY (document_id),
CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES user_login(user_id) ON DELETE CASCADE
);


-- public.embeddings definition

-- Drop table

-- DROP TABLE embeddings;

CREATE EXTENSION IF NOT EXISTS vector;


CREATE TABLE embeddings (
embed_id serial4 NOT NULL,
document_id int4 NOT NULL,
embedding public.vector NULL,
chunk_text varchar NULL,
chunk_index int4 NULL,
CONSTRAINT embeddings_pkey PRIMARY KEY (embed_id),
CONSTRAINT embeddings_document_id_fkey FOREIGN KEY (document_id) REFERENCES "document"(document_id) ON DELETE CASCADE
);


-- public.sessions definition

-- Drop table

-- DROP TABLE sessions;

CREATE TABLE sessions (
session_id serial4 NOT NULL,
user_id int4 NULL,
session_name varchar(200) NOT NULL,
CONSTRAINT sessions_pkey PRIMARY KEY (session_id),
CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_login(user_id)
);


-- public.chat_history definition

-- Drop table

-- DROP TABLE chat_history;

CREATE TABLE chat_history (
message_id serial4 NOT NULL,
session_id int4 NULL,
sender varchar(10) NOT NULL,
message text NOT NULL,
created_at timestamp DEFAULT now() NULL,
CONSTRAINT chat_history_pkey PRIMARY KEY (message_id),
CONSTRAINT chat_history_sender_check CHECK (((sender)::text = ANY ((ARRAY['User'::character varying, 'Bot'::character varying])::text[]))),
CONSTRAINT chat_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);


-- public.sessiondocuments definition

-- Drop table

-- DROP TABLE sessiondocuments;

CREATE TABLE sessiondocuments (
id serial4 NOT NULL,
session_id int4 NOT NULL,
document_id int4 NOT NULL,
CONSTRAINT sessiondocuments_pkey PRIMARY KEY (id),
CONSTRAINT sessiondocuments_session_id_document_id_key UNIQUE (session_id, document_id),
CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES "document"(document_id) ON DELETE CASCADE,
CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);
