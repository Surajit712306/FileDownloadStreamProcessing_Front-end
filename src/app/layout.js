import "./globals.css";
import Providers from "./Providers";

export const metadata = {
  title: "Large File Download Software",
  description: "Software to resumable download large files",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
