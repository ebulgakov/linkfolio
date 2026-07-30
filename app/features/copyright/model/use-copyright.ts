export function useCopyright() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return computed(() => t("footer.copyright", { year }));
}
