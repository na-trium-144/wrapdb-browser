import { useCallback, useEffect, useRef, useState } from "react";
import type { Route } from "./+types/home";
import { Link, useNavigate } from "react-router";
import { Section } from "~/components/section";
import clsx from "clsx";
import { HeaderHome } from "~/components/header";
import { SearchBox } from "~/components/search-box";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WrapDB Browser" },
    {
      name: "description",
      content: "An unofficial browser for WrapDB packages.",
    },
  ];
}

export default function Home() {
  return (
    <>
      <HeaderHome />
      <div className="mt-20 w-full max-w-3xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-content-0 dark:text-content-0d">
          WrapDB Browser
        </h1>
        <p className="text-lg sm:text-xl text-content-2 dark:text-content-2d">
          The unofficial browser for WrapDB packages.
        </p>

        <SearchBox
          className="mt-8 mb-12 w-full max-w-120 mx-auto"
          inputClassName="px-4 py-2 text-lg"
          submitClassName="px-4 text-lg"
          submitContent="Search"
        />

        <main>
          <Section
            title="What is this site?"
            className="mb-8 mx-auto max-w-160"
          >
            This is an unofficial web interface for searching packages available
            on WrapDB. You can quickly find the Meson build system wrap files
            you need.
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="What is Meson?">
              Meson is an open-source build system designed to be both extremely
              fast and as user-friendly as possible. It uses a simple,
              non-turing-complete DSL to define builds.
              <p className="mt-1">
                <a
                  href="https://mesonbuild.com/"
                  target="_blank"
                  rel="noopener"
                  className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
                >
                  Learn more &rarr;
                </a>
              </p>
            </Section>
            <Section title="What is WrapDB?">
              WrapDB is the official package repository for the Meson build
              system. It provides a collection of build definitions (wraps) for
              various third-party libraries.
              <p className="mt-1">
                <a
                  href="https://mesonbuild.com/Wrap-dependency-system-manual.html"
                  target="_blank"
                  rel="noopener"
                  className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
                >
                  Learn more &rarr;
                </a>
              </p>
            </Section>
          </div>
        </main>
      </div>
    </>
  );
}
