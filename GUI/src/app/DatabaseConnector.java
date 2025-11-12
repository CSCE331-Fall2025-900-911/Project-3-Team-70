package app;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnector {

    // Remote TAMU Postgres database

    // TODO: Use scanner input to populate these instance variables. Boilerplate code in LineReader.java.
    private static String DB_URL = "";
    private static String DB_USER = "";
    private static String DB_PASSWORD= ""; // <— fill this in

    private static Connection connection = null;

    public static void setDbUrl(String url) {
        DB_URL = url;
    }

    public static void setDbUser(String user) {
        DB_USER = user;
    }

    public static void setDbPassword(String password) {
        DB_PASSWORD = password;
    }

    
    public static Connection getConnection() {
        try {
            // Load PostgreSQL JDBC driver explicitly
            Class.forName("org.postgresql.Driver");
            Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
            System.out.println(" Connected to TAMU Postgres database successfully!");
            return conn;

        } catch (ClassNotFoundException e) {
            System.err.println(" PostgreSQL JDBC driver not found.");
            e.printStackTrace();
            return null;

        } catch (SQLException e) {
            System.err.println(" Database connection failed: " + e.getMessage());
            return null;
        }
    }
}

