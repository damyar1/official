-- اجرای یک‌باره در Supabase > SQL Editor
create table if not exists public.about_settings (
  id integer primary key default 1 check (id = 1),
  about_title text not null default 'دربارهٔ دامیار',
  about_content text not null default 'دامیار مهر و لامرد با هدف گردآوری و انتشار اخبار، مطالب آموزشی و اطلاعات کاربردی در حوزه دامداری، دام و طیور و کشاورزی فعالیت می‌کند.',
  support_title text not null default 'ارتباط با پشتیبانی',
  support_description text not null default 'برای پرسش‌ها و پیشنهادها می‌توانید از راه ارتباطی زیر با پشتیبانی دامیار در تماس باشید.',
  support_label text not null default 'ارتباط با پشتیبانی',
  support_url text not null default 'https://eitaa.com/@Emadreza_Amirfoad',
  updated_at timestamptz not null default now()
);

insert into public.about_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.about_settings enable row level security;

drop policy if exists "about settings public read" on public.about_settings;
create policy "about settings public read"
on public.about_settings for select
to anon, authenticated
using (true);

drop policy if exists "about settings authenticated manage" on public.about_settings;
create policy "about settings authenticated manage"
on public.about_settings for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

grant select on public.about_settings to anon, authenticated;
grant insert, update, delete on public.about_settings to authenticated;

notify pgrst, 'reload schema';
