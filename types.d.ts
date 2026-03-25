declare module "html-to-pdfmake" {
  const htmlToPdfmake: (html: string, options?: Record<string, unknown>) => any;
  export default htmlToPdfmake;
}

declare module "pdfmake/build/pdfmake" {
  const pdfMake: any;
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const fonts: any;
  export default fonts;
}
