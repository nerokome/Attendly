
"use client";
import Image from "next/image";
import { useUserPrivileges } from "@/utils/userPrivileges";
import { useState } from "react";
import { useRouter } from "next/navigation";

const Header = () => {
  const { user } = useUserPrivileges();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const userInitials =
    user?.email
      ?.split("@")[0]
      ?.split(" ")
      .map((n: string) => n[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div id="header" className="!flex !justify-between !items-center relative">
      <div></div>

      <div className="flex items-center gap-[20px] relative">


        <div
          className="flex items-center gap-[10px] cursor-pointer"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <div className="w-[40px] h-[40px] bg-[#F2F4F7] border border-[#E5E7EB] rounded-full box-border flex items-center justify-center text-[#3A4050] font-semibold text-sm">
            {userInitials}
          </div>

          <div>
            <h3 className="font-medium text-[14px] leading-[150%] text-[#3A4050]">
            {user?.fullName || "??"}
            </h3>
            <p className="font-normal text-[12px] leading-[150%] text-[#3A4050]">
              {user?.role || "??"}
            </p>
          </div>
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-[60px] w-[200px] bg-white border border-gray-200   shadow-lg z-50">
            <div className="absolute top-[-6px] right-5 w-3 h-3 bg-white rotate-45 border-t border-l border-gray-200"></div>
            <div className="p-4 flex flex-col gap-2">
              <div>
                <p className="text-sm text-gray-700 mb-0.5">Signed in as</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <hr className="border-gray-100 my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-center cursor-pointer font-medium rounded-none"
              >
                Profile Settings
              </button>
              <button
                onClick={async () => {
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("attendly_user");
                    localStorage.removeItem("attendly_user_profile");
                  }
                  const { signOut } = await import("next-auth/react");
                  await signOut({
                    callbackUrl: "/",
                  });
                }}
                className="w-full px-4 py-2 text-sm text-white !bg-[#2563EB]   hover:bg-blue-700 rounded-none text-center cursor-pointer font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
