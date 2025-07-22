import {useAuthUser} from "../hooks/useAuth.ts";


const Home = () => {
    const { user, loading } = useAuthUser();

    if (loading) return <p>Loading...</p>;

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold">Welcome, {user?.name || "User"} 👋</h1>
            <pre className="mt-2 text-sm text-gray-600">{JSON.stringify(user, null, 2)}</pre>
        </div>
    );
}

export default Home;