import { PageAnalytics } from "~/app/_components/page-analytics";
import { TrackedButton } from "~/app/_components/tracked-button";
import { TrackedLink } from "~/app/_components/tracked-link";

/**
 * Static reproduction of the deployed FTD Educação home page (see
 * `ftd_site.png` at the repository root), built for demo purposes.
 *
 * Structure, spacing and colours mirror the screenshot; every photograph and
 * logo asset is left as a blank placeholder. Links and buttons are inert — they
 * carry the analytics tagging required by TAGGING_RULES.md but point at `#`.
 */

const CONTAINER = "mx-auto w-full max-w-[1010px] px-5";

/* ------------------------------------------------------------------ atoms */

/** Stable keys for purely decorative, repeated elements. */
function decorKeys(prefix: string, count: number) {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

/** Blank stand-in for a photograph or logo asset. */
function Blank({ className = "" }: { className?: string }) {
	return <div aria-hidden="true" className={`bg-neutral-300 ${className}`} />;
}

/** The solid right-pointing triangle used across the FTD brand system. */
function Triangle({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="currentColor"
			viewBox="0 0 12 14"
		>
			<path d="M1.2 1.1a1 1 0 0 1 1.55-.84l7.6 5.06a1 1 0 0 1 0 1.66l-7.6 5.06a1 1 0 0 1-1.55-.84V1.1Z" />
		</svg>
	);
}

/** Bold ">" chevron mark (hero eyebrow, solution cards). */
function Chevron({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="3"
			viewBox="0 0 16 24"
		>
			<path d="M3 3l9 9-9 9" />
		</svg>
	);
}

/** Small caret used by the nav items that open a dropdown. */
function Caret({ className = "" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="2"
			viewBox="0 0 12 8"
		>
			<path d="M1 1.5 6 6.5l5-5" />
		</svg>
	);
}

/** Decorative field of triangles, repeated as a background pattern. */
function TriangleField({
	className = "",
	color,
	id,
}: {
	className?: string;
	color: string;
	id: string;
}) {
	return (
		<svg aria-hidden="true" className={className}>
			<defs>
				<pattern height="34" id={id} patternUnits="userSpaceOnUse" width="34">
					<path d="M6 6 L21 13.5 L6 21 Z" fill={color} />
				</pattern>
			</defs>
			<rect fill={`url(#${id})`} height="100%" width="100%" />
		</svg>
	);
}

/** Text stand-in for the FTD Educação lock-up. */
function Wordmark({ subColor }: { subColor: string }) {
	return (
		<span className="block leading-none">
			<span className="block font-extrabold text-[34px] tracking-[0.06em]">
				FTD
			</span>
			<span
				className={`mt-1 block font-semibold text-[17px] tracking-[0.02em] ${subColor}`}
			>
				educação
			</span>
		</span>
	);
}

/* ------------------------------------------------------------------ header */

const NAV_ITEMS = [
	{ hasMenu: true, label: "Sobre" },
	{ hasMenu: true, label: "Soluções" },
	{ hasMenu: true, label: "Parcerias e Inovação" },
	{ hasMenu: false, label: "PNLD" },
	{ hasMenu: false, label: "Blog" },
];

function SiteHeader() {
	return (
		<header className="absolute inset-x-0 top-0 z-20">
			<div className={`${CONTAINER} flex h-[112px] items-center gap-8`}>
				<TrackedLink
					className="text-white"
					href="#"
					trackingLabel="Wordmark"
					trackingPosition={0}
					trackingSource="site_header"
				>
					<Wordmark subColor="text-white" />
				</TrackedLink>

				<nav className="ml-auto flex items-center gap-7">
					{NAV_ITEMS.map((item) => (
						<TrackedLink
							className="flex items-center gap-1.5 font-semibold text-[15px] text-white"
							href="#"
							key={item.label}
							trackingLabel={item.label}
							trackingSource="site_header"
						>
							{item.label}
							{item.hasMenu ? <Caret className="w-[11px]" /> : null}
						</TrackedLink>
					))}

					<TrackedLink
						className="rounded-full bg-ftd-yellow px-6 py-2.5 font-bold text-[15px] text-black"
						href="#"
						trackingLabel="Lumisfera"
						trackingPosition={2}
						trackingSource="site_header"
					>
						Lumisfera
					</TrackedLink>

					<TrackedButton
						aria-label="Buscar"
						className="text-white"
						trackingAction="buscar"
						trackingLabel="Buscar"
						trackingSource="site_header"
						type="button"
					>
						<svg
							aria-hidden="true"
							className="h-[22px] w-[22px]"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
						>
							<circle cx="10.5" cy="10.5" r="7" />
							<path d="m16 16 5 5" />
						</svg>
					</TrackedButton>
				</nav>
			</div>
		</header>
	);
}

/* -------------------------------------------------------------------- hero */

function HeroSection() {
	return (
		<section className="relative h-[846px] overflow-hidden bg-ftd-red">
			{/* Orange S-curve blob and purple right-hand field. */}
			<svg
				aria-hidden="true"
				className="absolute inset-0 h-full w-full"
				preserveAspectRatio="none"
				viewBox="0 0 1904 820"
			>
				<path
					d="M1090 0 L1290 0 C1330 90 1470 170 1600 270 C1680 340 1700 420 1693 460 C1686 530 1640 620 1560 690 C1495 748 1430 792 1400 820 L1090 820 L1090 500 C1090 420 1245 380 1245 300 C1245 230 1090 210 1090 150 Z"
					fill="#FFA100"
				/>
				<path
					d="M1290 0 C1330 90 1470 170 1600 270 C1680 340 1700 420 1693 460 C1686 530 1640 620 1560 690 C1495 748 1430 792 1400 820 L1904 820 L1904 0 Z"
					fill="#BE83FF"
				/>
			</svg>

			<SiteHeader />

			<div className={`${CONTAINER} relative h-full`}>
				{/* Headline + CTA */}
				<div className="absolute top-[268px] left-5">
					<h1 className="font-extrabold text-[46px] text-white uppercase leading-[1.04] tracking-[-0.01em]">
						FTD
						<br />
						com
						<br />
						você
					</h1>
					<p className="mt-9 font-bold text-[46px] text-ftd-yellow leading-[1.04]">
						na Escola
						<br />
						<span className="inline-flex items-center gap-2">
							<span aria-hidden="true" className="grid grid-cols-4 gap-[3px]">
								{decorKeys("dot", 12).map((key) => (
									<span
										className="block h-[4px] w-[4px] rounded-full bg-ftd-yellow"
										key={key}
									/>
								))}
							</span>
							Pública
						</span>
					</p>
					<TrackedLink
						className="mt-7 inline-block rounded-lg bg-black px-8 py-3 font-bold text-[15px] text-white"
						href="#"
						trackingLabel="Cadastre-se grátis"
						trackingPosition={0}
						trackingSource="hero"
					>
						Cadastre-se grátis
					</TrackedLink>
				</div>

				{/* Supporting copy */}
				<div className="absolute top-[206px] left-[317px] w-[232px]">
					<Chevron className="h-[26px] w-[17px] text-ftd-yellow" />
					<p className="mt-4 font-semibold text-[19px] text-white leading-[1.35]">
						Crie atividades, planeje aulas e organize sua rotina com facilidade.
					</p>
				</div>

				{/* Product screenshot placeholder */}
				<Blank className="absolute top-[320px] left-[468px] h-[372px] w-[622px] rounded-md" />

				{/* Carousel indicators */}
				<div
					aria-hidden="true"
					className="absolute bottom-[90px] left-5 flex gap-2"
				>
					{decorKeys("slide", 5).map((key, index) => (
						<span
							className={`block h-[5px] w-[72px] rounded-full ${
								index === 0 ? "bg-white" : "bg-white/40"
							}`}
							key={key}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

/* ------------------------------------------------------------------- stats */

const STATS = [
	{
		caption: "anos de atuação na Educação brasileira.",
		icon: (
			<>
				<path d="M14 6 24 26M34 6 24 26" />
				<circle cx="24" cy="34" r="10" />
				<path d="m24 29 1.7 3.4 3.8.6-2.7 2.7.6 3.8-3.4-1.8-3.4 1.8.6-3.8-2.7-2.7 3.8-.6L24 29Z" />
			</>
		),
		suffix: null,
		value: "120",
	},
	{
		caption: "de estudantes atendidos na Educação básica todos os anos.",
		icon: (
			<>
				<path d="M6 14 24 7l18 7-18 7-18-7Z" />
				<path d="M12 17v7M12 24c0 2.2 5.4 4 12 4s12-1.8 12-4" />
				<path d="M14 41c1.4-5.8 5.3-9 10-9s8.6 3.2 10 9" />
				<circle cx="24" cy="27" r="5" />
			</>
		),
		suffix: "mi",
		value: "16",
	},
	{
		caption: "pontos de atendimento espalhados por todo o Brasil.",
		icon: (
			<>
				<path d="M8 42V8h20v34" />
				<path d="M14 15h3M22 15h3M14 23h3M22 23h3" />
				<path d="M16 42v-9h5v9" />
				<circle cx="36" cy="24" r="6" />
				<path d="M28 42c0-5 3.6-9 8-9s8 4 8 9" />
			</>
		),
		suffix: null,
		value: "20",
	},
];

function StatsSection() {
	return (
		<section className="relative z-10 -mt-[26px] rounded-[26px] bg-ftd-sky pt-[140px] pb-[134px] shadow-[0_18px_28px_-24px_rgba(0,0,0,0.35)]">
			<div className={CONTAINER}>
				<h2 className="font-semibold text-[32px] text-white leading-[1.35]">
					Educamos as crianças de hoje
					<br />
					para serem os cidadãos do amanhã.
				</h2>
				<TrackedLink
					className="mt-8 inline-block rounded-lg bg-black px-7 py-3 font-bold text-[15px] text-white"
					href="#"
					trackingLabel="Saiba mais"
					trackingPosition={0}
					trackingSource="stats"
				>
					Saiba mais
				</TrackedLink>

				<dl className="mt-[92px] grid grid-cols-3 gap-x-[76px]">
					{STATS.map((stat) => (
						<div key={stat.value}>
							<svg
								aria-hidden="true"
								className="h-[92px] w-[92px] text-ftd-blue"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2.4"
								viewBox="0 0 48 48"
							>
								{stat.icon}
							</svg>
							<dd className="mt-3 flex items-end gap-3 font-extrabold text-[86px] text-white leading-[0.85] tracking-[-0.03em]">
								<span>
									<span className="text-ftd-blue">+</span>
									{stat.value}
								</span>
								{stat.suffix ? (
									<span className="pb-1 font-medium text-[46px] leading-none">
										{stat.suffix}
									</span>
								) : null}
							</dd>
							<dt className="mt-5 max-w-[248px] font-bold text-[17px] text-ftd-ink leading-[1.35]">
								{stat.caption}
							</dt>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}

/* ---------------------------------------------------------------- personas */

function PersonasSection() {
	return (
		<section className="bg-white pt-[236px]">
			<div className="mx-auto flex w-full max-w-[1400px] justify-center px-5 [margin-bottom:-60px]">
				{/* Escolas */}
				<TrackedLink
					className="relative -mr-[10px] block h-[568px] w-[480px] translate-y-[50px] overflow-hidden rounded-[88px_48px_88px_48px] bg-ftd-card-orange"
					href="#"
					trackingLabel="Escolas"
					trackingPosition={0}
					trackingSource="personas"
				>
					<svg
						aria-hidden="true"
						className="absolute inset-0 h-full w-full"
						preserveAspectRatio="none"
						viewBox="0 0 480 568"
					>
						<path
							d="M0 168 L230 310 C320 370 392 420 401 500 C404 530 401 550 398 568 L296 568 L0 340 Z"
							fill="#FFD200"
						/>
					</svg>
					<div className="relative px-14 pt-14 text-center">
						<h3 className="font-bold text-[26px] text-white">Escolas</h3>
						<p className="mt-2 text-[15px] text-white leading-[1.45]">
							Veja as soluções voltadas para a experiência completa de ensino em
							todo o ecossistema escolar.
						</p>
					</div>
					<Blank className="absolute bottom-0 left-1/2 h-[300px] w-[190px] -translate-x-1/2 rounded-t-2xl" />
				</TrackedLink>

				{/* Estudantes */}
				<TrackedLink
					className="relative z-10 -mr-[10px] block h-[568px] w-[480px] translate-y-[100px] overflow-hidden rounded-[88px_48px_88px_48px] bg-ftd-purple"
					href="#"
					trackingLabel="Estudantes"
					trackingPosition={1}
					trackingSource="personas"
				>
					<div
						aria-hidden="true"
						className="absolute bottom-[54px] left-0 grid w-full grid-cols-8 gap-x-[18px] gap-y-[26px] px-9 text-ftd-yellow"
					>
						{decorKeys("tri", 24).map((key) => (
							<Triangle className="w-[26px]" key={key} />
						))}
					</div>
					<div className="relative px-16 pt-[100px] text-center">
						<h3 className="font-bold text-[26px] text-white">Estudantes</h3>
						<p className="mt-2 text-[15px] text-white leading-[1.45]">
							Conheça as oportunidades que a{" "}
							<span className="font-bold">FTD Educação</span> oferece para o
							aprendizado dos estudantes.
						</p>
					</div>
					<Blank className="absolute bottom-0 left-1/2 h-[262px] w-[168px] -translate-x-1/2 rounded-t-2xl" />
				</TrackedLink>

				{/* Famílias */}
				<TrackedLink
					className="relative block h-[568px] w-[480px] overflow-hidden rounded-[88px_48px_88px_48px] bg-ftd-red"
					href="#"
					trackingLabel="Famílias"
					trackingPosition={2}
					trackingSource="personas"
				>
					<svg
						aria-hidden="true"
						className="absolute inset-0 h-full w-full"
						preserveAspectRatio="none"
						viewBox="0 0 480 568"
					>
						<path d="M250 285 L480 405 L480 568 L322 568 Z" fill="#46B2FF" />
					</svg>
					<div className="relative px-14 pt-11 text-center">
						<h3 className="font-bold text-[26px] text-white">Famílias</h3>
						<p className="mt-2 text-[15px] text-white leading-[1.45]">
							Saiba como podemos aproximar as famílias do ensino e da jornada
							dos estudantes.
						</p>
					</div>
					<Blank className="absolute bottom-0 left-1/2 h-[336px] w-[248px] -translate-x-1/2 rounded-t-2xl" />
				</TrackedLink>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------- solutions */

const SOLUTIONS = [
	{ accent: "text-ftd-yellow", label: "Sistemas de Ensino" },
	{ accent: "text-ftd-red", label: "didáticas e literárias" },
	{ accent: "text-ftd-sky", label: "digitais" },
	{ accent: "text-ftd-purple", label: "suplementares" },
];

function SolutionsSection() {
	return (
		<section className="relative rounded-t-[26px] bg-gradient-to-b from-ftd-blue via-ftd-blue to-ftd-blue-light pt-[243px] pb-[124px]">
			<div className={CONTAINER}>
				<div className="flex items-start justify-between">
					<div>
						<h2 className="font-semibold text-[24px] text-white leading-[1.4]">
							Conheça as soluções
							<br />
							<span className="font-bold">da FTD Educação</span>
						</h2>
						<p className="mt-3 text-[15px] text-white">
							Clique nas imagens para conhecer cada detalhe.
						</p>
					</div>
					<div
						aria-hidden="true"
						className="mt-2 flex w-[500px] items-center justify-between text-white/25"
					>
						{decorKeys("arrow", 19).map((key) => (
							<Triangle className="w-[13px]" key={key} />
						))}
					</div>
				</div>

				<ul className="mt-[52px] grid grid-cols-4 gap-[17px]">
					{SOLUTIONS.map((solution) => (
						<li key={solution.label}>
							<TrackedLink
								className="relative block h-[410px] overflow-hidden rounded-[18px] shadow-[0_16px_30px_-10px_rgba(0,0,0,0.45)]"
								href="#"
								trackingLabel={`Soluções ${solution.label}`}
								trackingSource="solutions"
							>
								<Blank className="absolute inset-0" />
								<div
									aria-hidden="true"
									className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent"
								/>
								<Chevron
									className={`absolute top-[42px] left-0 h-[46px] w-[34px] ${solution.accent}`}
								/>
								<span className="absolute bottom-[26px] left-[14px] block text-[15px] text-white leading-[1.5]">
									Soluções
									<br />
									<span className="font-bold">{solution.label}</span>
								</span>
							</TrackedLink>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

/* ------------------------------------------------------------------ brands */

const BRANDS = [
	{
		body: "De materiais didáticos à literatura nacional e estrangeira, na Lumisfera você pode comprar com segurança e praticidade.",
		iconClass: "!bg-ftd-lumisfera",
		name: "Lumisfera",
		nameClass: "text-ftd-lumisfera",
		title:
			"A loja virtual de literatura e materiais didáticos da FTD Educação.",
	},
	{
		body: "Artigos e materiais interativos para enriquecer o ensino-aprendizagem dentro e fora da sala de aula.",
		iconClass: "!bg-ftd-conteudo",
		name: "Conteúdo aberto",
		nameClass: "text-ftd-conteudo",
		title:
			"Um portal multimídia com conteúdos completos para professores e estudantes.",
	},
	{
		body: "Uma plataforma repleta de recursos educacionais que conecta estudantes, professores, gestores e família em um só lugar.",
		iconClass: "!bg-ftd-ionica",
		name: "iônica",
		nameClass: "text-ftd-ionica",
		title: "Conheça o ambiente digital de aprendizagem da FTD Educação.",
	},
];

function BrandsSection() {
	return (
		<section className="relative z-10 -mt-[26px] overflow-hidden rounded-[26px] bg-ftd-gray pt-[274px] pb-[90px]">
			<TriangleField
				className="pointer-events-none absolute top-[228px] left-[250px] h-[112px] w-[1020px]"
				color="#FFFFFF"
				id="brands-triangles"
			/>
			<div className={`${CONTAINER} relative`}>
				<ul className="grid grid-cols-3 gap-x-[76px]">
					{BRANDS.map((brand) => (
						<li className="flex flex-col" key={brand.name}>
							<Blank
								className={`h-[131px] w-[131px] rounded-[30px] ${brand.iconClass}`}
							/>
							<p className={`mt-4 text-[19px] ${brand.nameClass}`}>
								{brand.name}
							</p>
							<h3 className="mt-6 font-bold text-[17px] text-ftd-ink leading-[1.45]">
								{brand.title}
							</h3>
							<p className="mt-3 text-[15px] text-ftd-body leading-[1.6]">
								{brand.body}
							</p>
							<TrackedLink
								className="mt-6 inline-block self-start rounded-[10px] bg-ftd-gray-button px-8 py-[11px] font-bold text-[14px] text-black"
								href="#"
								trackingLabel="Saiba mais"
								trackingSource="brands"
							>
								Saiba mais
							</TrackedLink>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

/* --------------------------------------------------------------- transform */

function TransformSection() {
	return (
		<section className="relative z-0 -mt-[26px] h-[502px] overflow-hidden bg-neutral-900 py-[26px]">
			<Blank className="!bg-[#0d0f14] absolute inset-0" />
			<div
				className={`${CONTAINER} relative flex h-full flex-col justify-center`}
			>
				<h2 className="max-w-[620px] font-bold text-[36px] text-white leading-[1.25]">
					Soluções que transformam a Educação no país.
				</h2>
				<TrackedLink
					className="mt-8 inline-block self-start rounded-full bg-ftd-amber px-9 py-3 font-bold text-[15px] text-white"
					href="#"
					trackingLabel="Saiba mais"
					trackingPosition={0}
					trackingSource="transform"
				>
					Saiba mais
				</TrackedLink>
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------- news */

const NEWS = [
	{
		title:
			"Prêmio Educador FTD: Livro sensorial criado por professora roraimense se destaca em premiação nacional",
	},
	{ title: "Ferramenta de IA ajuda na inclusão" },
];

function NewsSection() {
	return (
		<section className="relative z-10 -mt-[26px] overflow-hidden rounded-[26px] bg-white pt-[112px] pb-[110px]">
			<TriangleField
				className="pointer-events-none absolute top-[72px] right-[240px] h-[300px] w-[150px]"
				color="#F2F2F3"
				id="news-triangles"
			/>
			<div className={`${CONTAINER} relative`}>
				<div className="flex items-start justify-between gap-10">
					<div>
						<p className="text-[14px] text-ftd-red">Notícias</p>
						<h2 className="mt-1 max-w-[780px] text-[30px] text-ftd-ink leading-[1.32]">
							Confira o que os principais portais e veículos de comunicação
							falam sobre a <span className="font-bold">FTD Educação</span>.
						</h2>
					</div>
					<TrackedLink
						className="mt-6 shrink-0 rounded-full bg-black px-8 py-[15px] font-bold text-[15px] text-white"
						href="#"
						trackingLabel="Leia mais"
						trackingPosition={0}
						trackingSource="news"
					>
						Leia mais
					</TrackedLink>
				</div>

				<ul className="mt-[64px] grid grid-cols-3 gap-x-[76px]">
					{NEWS.map((item) => (
						<li key={item.title}>
							<TrackedLink
								className="block"
								href="#"
								trackingLabel={item.title}
								trackingSource="news"
							>
								<Blank className="h-[165px] w-full rounded-[8px_72px_72px_8px]" />
								<h3 className="mt-6 font-bold text-[#555555] text-[17px] leading-[1.45]">
									{item.title}
								</h3>
							</TrackedLink>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

/* -------------------------------------------------------------- newsletter */

function NewsletterSection() {
	return (
		<section className="relative z-0 -mt-[26px] bg-ftd-blue pt-[26px] pb-[104px]">
			<div
				className={`${CONTAINER} grid grid-cols-[490px_1fr] gap-[52px] pt-[92px]`}
			>
				<div>
					<h2 className="font-medium text-[30px] text-white leading-[1.32]">
						Quer ficar por dentro das
						<br />
						<span className="text-ftd-sky">novidades</span> da{" "}
						<span className="font-bold">FTD Educação</span>?
					</h2>
					<p className="mt-7 max-w-[390px] text-[16px] text-white leading-[1.5]">
						Assine a nossa newsletter e receba conteúdos interativos e artigos
						sobre Educação.
					</p>
				</div>

				<div className="pt-2">
					<div className="grid grid-cols-2 gap-[13px]">
						<input
							className="h-[44px] rounded-lg bg-ftd-gray px-4 text-[15px] text-ftd-body placeholder:text-ftd-body"
							placeholder="Nome *"
							readOnly
							type="text"
						/>
						<input
							className="h-[44px] rounded-lg bg-ftd-gray px-4 text-[15px] text-ftd-body placeholder:text-ftd-body"
							placeholder="Email *"
							readOnly
							type="email"
						/>
					</div>
					<div className="mt-[11px] flex h-[44px] items-center rounded-lg bg-ftd-gray px-4 text-[15px] text-ftd-body">
						Selecione
					</div>
					<p className="mt-[13px] text-[15px] text-white/60 leading-[1.5]">
						Ao clicar em assinar, você concorda em receber comunicados da FTD e
						com a{" "}
						<TrackedLink
							className="underline"
							href="#"
							trackingLabel="Política de Privacidade"
							trackingPosition={0}
							trackingSource="newsletter"
						>
							Política de Privacidade
						</TrackedLink>{" "}
						e{" "}
						<TrackedLink
							className="underline"
							href="#"
							trackingLabel="Termos de Uso"
							trackingPosition={1}
							trackingSource="newsletter"
						>
							Termos de Uso
						</TrackedLink>
						.
					</p>
					<TrackedButton
						className="mt-[13px] h-[54px] w-full rounded-lg bg-black text-[15px] text-white"
						trackingAction="assinar"
						trackingLabel="Assinar"
						trackingSource="newsletter"
						type="button"
					>
						Assinar
					</TrackedButton>
				</div>
			</div>
		</section>
	);
}

/* ------------------------------------------------------------------ footer */

const FOOTER_SOLUTIONS = [
	"Didáticos",
	"Literatura",
	"Idiomas",
	"Sistemas de Ensino",
	"Aprendizagem Digital",
	"Formação de educadores",
	"Projeto de Vida",
	"Educação Financeira",
	"Soluções Educação Pública",
	"PNLD",
];

const FOOTER_INSTITUTIONAL = [
	"Sobre nós",
	"Imprensa",
	"Compliance",
	"Premiações",
	"Trabalhe na FTD",
	"Grupo Marista",
	"Blog",
];

const FOOTER_ACCESS = [
	"Contato",
	"Loja Online",
	"Privacidade e Proteção de Dados",
	"Relatório de Transparência e Igualdade de Salários",
	"Sustentabilidade",
	"Responsabilidade Social",
	"Termos de Uso",
];

const SOCIAL_ICONS = [
	{
		label: "Facebook",
		path: "M13.5 8.5h2.5V5.6h-2.6C11 5.6 9.6 7 9.6 9.5v1.4H7.4v3h2.2V22h3.2v-8.1h2.6l.4-3h-3V9.6c0-.7.3-1.1 1.1-1.1Z",
	},
	{
		label: "Instagram",
		path: "M8 3.5h8A4.5 4.5 0 0 1 20.5 8v8A4.5 4.5 0 0 1 16 20.5H8A4.5 4.5 0 0 1 3.5 16V8A4.5 4.5 0 0 1 8 3.5Zm0 2A2.5 2.5 0 0 0 5.5 8v8A2.5 2.5 0 0 0 8 18.5h8a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 16 5.5H8Zm4 2.6a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Zm0 2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Zm4.6-2.9a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
	},
	{
		label: "LinkedIn",
		path: "M4.5 9h3v12h-3V9Zm1.5-5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm4 5h2.9v1.6h.1c.5-.9 1.7-1.9 3.5-1.9 3 0 3.5 1.9 3.5 4.5V21h-3v-6c0-1.4-.3-2.5-1.7-2.5s-2.3 1-2.3 2.4V21h-3V9Z",
	},
	{
		label: "YouTube",
		path: "M21.3 7.6c-.2-1-1-1.8-2-2C17.5 5.2 12 5.2 12 5.2s-5.5 0-7.3.4c-1 .2-1.8 1-2 2C2.3 9.4 2.3 12 2.3 12s0 2.6.4 4.4c.2 1 1 1.8 2 2 1.8.4 7.3.4 7.3.4s5.5 0 7.3-.4c1-.2 1.8-1 2-2 .4-1.8.4-4.4.4-4.4s0-2.6-.4-4.4ZM10 15.3V8.7l5.7 3.3-5.7 3.3Z",
	},
];

function FooterColumn({
	heading,
	items,
	spacing,
}: {
	heading: string;
	items: string[];
	spacing: string;
}) {
	return (
		<div>
			<h3 className="font-bold text-[17px] text-white leading-[1.35]">
				{heading}
			</h3>
			<ul className={`mt-5 flex flex-col ${spacing}`}>
				{items.map((item) => (
					<li key={item}>
						<TrackedLink
							className="text-[15px] text-ftd-footer-link leading-[1.35]"
							href="#"
							trackingLabel={item}
							trackingSource="footer_column"
						>
							{item}
						</TrackedLink>
					</li>
				))}
			</ul>
		</div>
	);
}

function SiteFooter() {
	return (
		<footer className="bg-black">
			<div className={`${CONTAINER} pt-[125px] pb-[68px]`}>
				<div className="grid grid-cols-[233px_233px_233px_1fr] gap-x-[27px]">
					<FooterColumn
						heading="Soluções"
						items={FOOTER_SOLUTIONS}
						spacing="gap-[11px]"
					/>
					<FooterColumn
						heading="Institucional"
						items={FOOTER_INSTITUTIONAL}
						spacing="gap-[24px]"
					/>

					<div>
						<h3 className="max-w-[160px] font-bold text-[17px] text-white leading-[1.35]">
							Central de relacionamento
						</h3>
						<p className="mt-4 text-[15px] text-ftd-footer-link leading-[1.6]">
							Ligue: 0800 772 2300
							<br />
							Das 8h às 18h - Seg a sex
						</p>
						<h3 className="mt-4 font-bold text-[17px] text-white">Acesse</h3>
						<ul className="mt-3 flex flex-col gap-[2px]">
							{FOOTER_ACCESS.map((item) => (
								<li key={item}>
									<TrackedLink
										className="text-[15px] text-ftd-footer-link leading-[1.6]"
										href="#"
										trackingLabel={item}
										trackingSource="site_footer"
									>
										{item}
									</TrackedLink>
								</li>
							))}
						</ul>
					</div>

					<div>
						<TrackedLink
							className="inline-block text-white"
							href="#"
							trackingLabel="Wordmark"
							trackingPosition={1}
							trackingSource="site_footer"
						>
							<Wordmark subColor="text-ftd-sky" />
						</TrackedLink>
						<Blank className="!bg-[#d8231f] mt-7 h-[62px] w-[170px]" />
						<Blank className="!bg-neutral-800 mt-8 h-[74px] w-[170px]" />
						<ul className="mt-6 flex items-center gap-[22px]">
							{SOCIAL_ICONS.map((icon) => (
								<li key={icon.label}>
									<TrackedLink
										aria-label={icon.label}
										className="block text-white"
										href="#"
										trackingLabel={icon.label}
										trackingSource="site_footer"
									>
										<svg
											aria-hidden="true"
											className="h-[19px] w-[19px]"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d={icon.path} />
										</svg>
									</TrackedLink>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

			<div className="bg-white">
				<div
					className={`${CONTAINER} flex items-center justify-between py-[34px]`}
				>
					<p className="text-[13px] text-ftd-body leading-[1.6]">
						FTD Educação S/A 61.186.490/0001-57 | Rua Rui Barbosa 156, Bela
						Vista, São Paulo / SP - CEP 01326-010
						<br />© 2011 - 2026 FTD - Todos os direitos reservados.
					</p>
					<p className="flex shrink-0 items-center gap-2 text-[13px] text-ftd-body">
						Desenvolvido por <span className="font-bold text-black">SIOUX</span>
					</p>
				</div>
			</div>
		</footer>
	);
}

/* -------------------------------------------------------------------- page */

export default function HomePage() {
	return (
		<main className="overflow-x-hidden bg-white">
			<PageAnalytics pageName="home" />
			<HeroSection />
			<StatsSection />
			<PersonasSection />
			<SolutionsSection />
			<BrandsSection />
			<TransformSection />
			<NewsSection />
			<NewsletterSection />
			<SiteFooter />

			{/* Floating support widget */}
			<div
				aria-hidden="true"
				className="pointer-events-none fixed right-8 bottom-8 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
			>
				<svg
					aria-hidden="true"
					className="h-[28px] w-[28px] text-ftd-sky"
					fill="currentColor"
					viewBox="0 0 24 24"
				>
					<path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 6h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z" />
				</svg>
			</div>
		</main>
	);
}
