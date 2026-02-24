// src/MyLayout.js
import * as React from "react";
import { Layout } from "react-admin";
import MyMenu from "./MyMenu";

const MyLayout = (props) => {
  return <Layout {...props} menu={MyMenu} />;
};

export default MyLayout;
