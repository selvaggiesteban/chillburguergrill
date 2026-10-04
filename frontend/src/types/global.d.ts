import 'jquery';

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

declare module 'slick-carousel';
