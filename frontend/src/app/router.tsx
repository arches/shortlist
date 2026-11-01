import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router";

import { RestaurantScreen } from "@/features/managing-experiences/RestaurantScreen";
import { ListScreen } from "@/features/managing-my-list/ListScreen";
import { SignInScreen } from "@/features/signing-in/SignInScreen";
import { SignUpScreen } from "@/features/signing-in/SignUpScreen";
import { couldBeSignedIn } from "@/session/store";

// shortlist.stack.md: TanStack Router with code-based route definitions, not
// file-based.
const rootRoute = createRootRoute({
  component: Outlet,
});

// Scenario: Managing my list while signed out — "Then I am asked to sign in".
// Reaching the list without a session that could still be continued sends the
// owner here rather than firing a request that is certain to be refused.
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInRoute,
  beforeLoad: () => {
    if (couldBeSignedIn()) throw redirect({ to: "/" });
  },
});

// signing-in.scenarios.md, "Signing up": an account is created by whoever wants
// one. The guard is the sign-in screen's — an owner who already has a session
// that could be continued has nothing to sign up for.
const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  component: SignUpRoute,
  beforeLoad: () => {
    if (couldBeSignedIn()) throw redirect({ to: "/" });
  },
});

const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ListScreen,
  beforeLoad: () => {
    if (!couldBeSignedIn()) throw redirect({ to: "/sign-in" });
  },
});

// managing-experiences.wireframe.drawio.svg puts a restaurant's experiences on
// its own screen, reached from the list. The path mirrors the API's, which nests
// experiences under the restaurant they happened at.
const restaurantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/restaurants/$restaurantId",
  component: RestaurantRoute,
  beforeLoad: () => {
    if (!couldBeSignedIn()) throw redirect({ to: "/sign-in" });
  },
});

function RestaurantRoute() {
  const { restaurantId } = restaurantRoute.useParams();

  return <RestaurantScreen restaurantId={Number(restaurantId)} />;
}

function SignInRoute() {
  const navigate = signInRoute.useNavigate();

  return <SignInScreen onSignedIn={() => void navigate({ to: "/" })} />;
}

// "Then my list opens ... And I am not asked to sign in." The same landing as
// signing in, because signing up has already opened the session.
function SignUpRoute() {
  const navigate = signUpRoute.useNavigate();

  return <SignUpScreen onSignedUp={() => void navigate({ to: "/" })} />;
}

export function createAppRouter() {
  return createRouter({
    routeTree: rootRoute.addChildren([listRoute, restaurantRoute, signInRoute, signUpRoute]),
    defaultPreload: false,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
