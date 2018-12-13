DROP TABLE IF EXISTS [dbo].[hibernate_unique_key];
CREATE TABLE [dbo].[hibernate_unique_key](
	[next_hi] [bigint] NULL
) ON [PRIMARY];
INSERT INTO hibernate_unique_key (next_hi) VALUES ( '8675309' );

DROP TABLE IF EXISTS [dbo].[ZeModel];
CREATE TABLE [dbo].[ZeModel](
	[Id] [bigint] NOT NULL,
	[Text] [nvarchar](max) NULL,
 CONSTRAINT [PK_ZeModel] PRIMARY KEY CLUSTERED
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];

