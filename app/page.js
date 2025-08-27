import Image from 'next/image';

export default function CenteredImagePage() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh', // This makes the div take the full viewport height
        width: '100vw',  // This makes the div take the full viewport width
        backgroundColor: '#f0f0f0', // Optional: background color for the page
      }}
    >
      <Image
        src="https://ismis.usc.edu.ph/Content/reportheader1.png" // IMPORTANT: Replace with the path to your image in the `public` folder
        alt="A descriptive caption for the image"
        width={500} // Specify the desired width of the image
        height={300} // Specify the desired height of the image
        priority // Optional: loads the image faster if it's above the fold
      />
    </div>
  );
}