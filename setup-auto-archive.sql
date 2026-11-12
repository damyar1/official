-- دامیار: آرشیو خودکار خبرهای قدیمی‌تر از ۲۴ ساعت
alter table public.posts add column if not exists archived boolean not null default false;

create or replace function public.archive_old_damyar_news()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.posts
  set archived = true
  where lower(coalesce(kind, '')) = 'news'
    and coalesce(archived, false) = false
    and created_at <= now() - interval '24 hours';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- اجرای زمان‌بندی‌شده هر ساعت؛ هر خبر پس از گذشت ۲۴ ساعت در نوبت بعدی آرشیو می‌شود.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'damyar-archive-old-news';
select cron.schedule(
  'damyar-archive-old-news',
  '0 * * * *',
  $$select public.archive_old_damyar_news();$$
);

-- اجرای یک‌باره برای آرشیو خبرهایی که همین حالا بیش از ۲۴ ساعت عمر دارند.
select public.archive_old_damyar_news();
