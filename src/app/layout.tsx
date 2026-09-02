import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Poppins } from "next/font/google";
import { GoogleAnalytics } from "~/app/_components/google-analytics";

export const metadata: Metadata = {
	title: "FTD Educação",
	description:
		"FTD Educação — soluções educacionais para escolas, estudantes e famílias.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

/** Closest widely available stand-in for the geometric sans used by FTD. */
const poppins = Poppins({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	variable: "--font-poppins",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable} ${poppins.variable}`} lang="pt-BR">
			<body className="font-sans antialiased">{children}</body>
			<GoogleAnalytics />
		</html>
	);
}
