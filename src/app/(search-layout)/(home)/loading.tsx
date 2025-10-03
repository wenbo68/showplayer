import MediaListFallback from '../../_components/media/MediaListFallback';

export default function Loading() {
  // This is the skeleton for your entire Home page.
  // It will be shown instantly while the data in page.tsx is being fetched.
  return (
    <>
      <MediaListFallback
        viewMode={'preview'}
        label={'POPULAR MOVIES'}
        count={6}
      />
      <MediaListFallback
        viewMode={'preview'}
        label={'POPULAR SHOWS'}
        count={6}
      />
      <MediaListFallback viewMode={'preview'} label={'TOP MOVIES'} count={6} />
      <MediaListFallback viewMode={'preview'} label={'TOP SHOWS'} count={6} />
    </>
  );
}
